/**
 * ======================================================================
 * Knowledge QA LangGraph 状态机 - 知识库问答工作流
 * ======================================================================
 *
 * 🎯 核心目标：
 * 使用 LangGraph 定义一个完整的知识库问答工作流
 * - 接收用户问题 → 调用 LLM → 处理工具调用 → 返回答案
 *
 * 🏗️ 架构：
 * 这是一个单节点的 LangGraph，名为 'agent'
 * - 输入：用户问题 + 对话历史
 * - 输出：完整的文本回答
 *
 * 🔄 工作流程：
 * 1. 用户输入问题
 * 2. LLM 分析问题，可能调用知识搜索工具
 * 3. 工具返回搜索结果
 * 4. LLM 基于搜索结果生成最终答案
 * 5. 返回完整文本和所有中间步骤
 *
 * 📡 事件流：
 * - 流式输出时，实时发送事件给前端：
 *   * text-delta: 文本增量
 *   * node-start/node-result: 节点执行事件
 *   * 其他工具事件
 */
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { BaseMessage } from '@langchain/core/messages'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import type {
  LangchainClientChatMessage,
  LangchainClientRetrievalConfig,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type { AgentRuntime } from '../../factory'

/**
 * 从各种格式的内容中提取纯文本
 *
 * 🎯 用途：
 * LLM 返回的内容可能是：
 * - 纯字符串: "你好"
 * - 消息块数组: [{ type: 'text', text: '你好' }, ...]
 *
 * 这个函数统一提取文本部分
 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block?.type === 'text' && typeof block?.text === 'string') return block.text
        return ''
      })
      .join('')
  }
  return ''
}

/**
 * 将聊天历史转换为 LangChain 消息格式
 *
 * 🎯 作用：
 * 将前端的消息格式转换为 LangChain 能理解的 BaseMessage 对象
 *
 * 📝 转换规则：
 * - system → SystemMessage
 * - assistant → AIMessage
 * - user → HumanMessage
 * - 最后追加当前用户输入
 */
function toMessages(
  history: LangchainClientChatMessage[] | undefined,
  input: string
): BaseMessage[] {
  const messages: BaseMessage[] = []
  for (const item of history ?? []) {
    if (item.role === 'system') messages.push(new SystemMessage(item.content))
    else if (item.role === 'assistant') messages.push(new AIMessage(item.content))
    else messages.push(new HumanMessage(item.content))
  }
  messages.push(new HumanMessage(input))
  return messages
}

/**
 * ======================================================================
 * LangGraph State 定义 - 状态机的数据结构
 * ======================================================================
 *
 * 🎯 State 是 LangGraph 的核心，它在节点之间传递数据。
 * 每个节点读取 State，处理后返回更新的 State。
 *
 * 📌 字段说明：
 * - requestId: 请求 ID，用于追踪整个请求生命周期
 * - input: 用户当前的输入问题
 * - history: 历史对话记录（LangChainClientChatMessage[]）
 * - retrieval: 检索配置（可选，传递给工具层）
 * - abortSignal: 中断信号（用于取消请求）
 * - fullText: 最终生成的完整回答文本（增量累积）
 */
const State = Annotation.Root({
  requestId: Annotation<string>(),
  input: Annotation<string>(),
  // history 的 reducer：总是保留最新的历史记录
  history: Annotation<LangchainClientChatMessage[]>({
    value: (_left, right) => right,
    default: () => []
  }),
  retrieval: Annotation<LangchainClientRetrievalConfig | undefined>(),
  abortSignal: Annotation<AbortSignal | undefined>(),
  // fullText 的 reducer：总是保留最新的文本
  fullText: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  })
})

/**
 * 构建知识库问答图
 *
 * @param params.runtime - 包含 Agent 实例的运行时
 * @param params.emit - 用于向 Main Process 发送事件的函数
 */
export function buildKnowledgeQaGraph(params: {
  runtime: AgentRuntime
  emit: (msg: LangchainClientToMainMessage) => void
}) {
  /**
   * ======================================================================
   * Agent Node - 核心执行节点
   * ======================================================================
   *
   * 🎯 职责：
   * 1. 准备消息：将 State 中的 history 和 input 转换为 LangChain 消息
   * 2. 调用 Agent：使用 runtime.agent.stream() 启动流式调用
   * 3. 处理流事件：遍历 stream chunk，根据类型发送前端事件
   *
   * 🔄 Stream Chunk 处理流程：
   * - chunk.type === 'ai' (AI 消息增量)
   *   → 发送 invoke:text-delta (前端显示打字机效果)
   *   → 检测 tool_calls (工具调用请求)
   *     → 如果是 knowledge_search，发送 invoke:node-start
   *     → 其他工具，发送 invoke:tool-start
   *
   * - chunk.type === 'tool' (工具执行结果)
   *   → 如果是 knowledge_search，发送 invoke:node-result
   *   → 其他工具，发送 invoke:tool-result
   */
  const agentNode = async (state: typeof State.State) => {
    // 1. 准备消息上下文
    const messages = toMessages(state.history, state.input)
    let fullText = ''
    const seenToolCallIds = new Set<string>() // 防止重复处理工具调用 ID

    // 2. 启动 Agent 流式输出
    // streamMode: ['messages', 'updates'] 表示我们要监听完整的消息对象更新
    const stream = await params.runtime.agent.stream(
      { messages },
      {
        streamMode: ['messages', 'updates'],
        signal: state.abortSignal
      }
    )

    // 3. 遍历流式数据块 (Chunk)
    for await (const chunk of stream as any) {
      const [mode, value] = chunk as [string, any]

      // 我们只关心 'messages' 模式的更新
      if (mode !== 'messages') continue

      const [message] = value as [BaseMessage, Record<string, unknown>]
      const msgType = (message as any)?._getType?.() as string | undefined

      // ==================== A. 处理 AI 消息 (assistant) ====================
      if (msgType === 'ai') {
        // A1. 提取文本增量 (Delta)
        const delta = extractTextFromContent((message as any).content)
        if (delta && delta.trim()) {
          fullText += delta
          // 🔥 发送文本增量事件 -> 前端打字机效果
          params.emit({ type: 'invoke:text-delta', requestId: state.requestId, delta })
        }

        // A2. 提取工具调用 (Tool Calls)
        const toolCalls =
          (message as any).tool_calls ??
          (message as any).toolCalls ??
          (message as any).additional_kwargs?.tool_calls

        if (Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            const id = String(tc?.id ?? '')
            // 去重处理：防止同一个工具调用被多次处理
            if (!id || seenToolCallIds.has(id)) continue
            seenToolCallIds.add(id)

            const toolName = String(tc?.name ?? 'unknown')

            // 🌟 核心逻辑：区分知识检索和其他工具
            if (toolName === 'knowledge_search') {
              // 知识检索 -> 发送 Node 事件
              params.emit({
                type: 'invoke:node-start',
                requestId: state.requestId,
                payload: {
                  nodeId: `knowledge_search:${id}`,
                  nodeKind: 'knowledge_retrieval',
                  label: '知识库检索',
                  // uiHint 告诉前端用哪个组件渲染
                  uiHint: { component: 'knowledge-search', title: '知识库检索' },
                  inputs: { query: tc?.args?.query }
                }
              })
            } else {
              // 其他工具 -> 发送 Tool 事件
              params.emit({
                type: 'invoke:tool-start',
                requestId: state.requestId,
                payload: {
                  toolCallId: id,
                  toolName,
                  toolArgs: tc?.args
                }
              })
            }
          }
        }

        continue
      }

      // ==================== B. 处理工具结果 (tool) ====================
      if (msgType === 'tool' || ToolMessage.isInstance(message)) {
        const toolName = String((message as any).name ?? 'tool')
        const toolCallId = String((message as any).tool_call_id ?? '')
        const resultText = extractTextFromContent((message as any).content)

        // 🌟 核心逻辑：区分知识检索和其他工具
        if (toolName === 'knowledge_search') {
          // 知识检索 -> 发送 Node 结果事件
          params.emit({
            type: 'invoke:node-result',
            requestId: state.requestId,
            payload: {
              nodeId: `knowledge_search:${toolCallId || 'unknown'}`,
              nodeKind: 'knowledge_retrieval',
              label: '知识库检索',
              uiHint: { component: 'knowledge-search', title: '知识库检索' },
              outputs: { result: resultText || (message as any).content }
            }
          })
        } else {
          // 其他工具 -> 发送 Tool 结果事件
          params.emit({
            type: 'invoke:tool-result',
            requestId: state.requestId,
            payload: {
              toolCallId: toolCallId || 'unknown',
              toolName,
              result: resultText || (message as any).content
            }
          })
        }
      }
    }

    return { fullText }
  }

  // 构建 LangGraph
  // 简单拓扑：START -> agent -> END
  const graph = new StateGraph(State)
    .addNode('agent', agentNode)
    .addEdge(START, 'agent')
    .addEdge('agent', END)
    .compile()

  return graph
}
