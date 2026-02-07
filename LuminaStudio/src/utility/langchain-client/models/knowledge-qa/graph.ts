import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { BaseMessage } from '@langchain/core/messages'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import type {
  LangchainClientChatMessage,
  LangchainClientRetrievalConfig,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type { AgentRuntime } from '../../factory'

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

const State = Annotation.Root({
  requestId: Annotation<string>(),
  input: Annotation<string>(),
  history: Annotation<LangchainClientChatMessage[]>({
    value: (_left, right) => right,
    default: () => []
  }),
  retrieval: Annotation<LangchainClientRetrievalConfig | undefined>(),
  abortSignal: Annotation<AbortSignal | undefined>(),
  fullText: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  })
})

export function buildKnowledgeQaGraph(params: {
  runtime: AgentRuntime
  emit: (msg: LangchainClientToMainMessage) => void
}) {
  const agentNode = async (state: typeof State.State) => {
    const messages = toMessages(state.history, state.input)
    let fullText = ''
    const seenToolCallIds = new Set<string>()

    const stream = await params.runtime.agent.stream(
      { messages },
      {
        streamMode: ['messages', 'updates'],
        signal: state.abortSignal
      }
    )

    for await (const chunk of stream as any) {
      const [mode, value] = chunk as [string, any]

      if (mode !== 'messages') continue

      const [message] = value as [BaseMessage, Record<string, unknown>]
      const msgType = (message as any)?._getType?.() as string | undefined

      if (msgType === 'ai') {
        const delta = extractTextFromContent((message as any).content)
        if (delta && delta.trim()) {
          fullText += delta
          params.emit({ type: 'invoke:text-delta', requestId: state.requestId, delta })
        }

        const toolCalls =
          (message as any).tool_calls ??
          (message as any).toolCalls ??
          (message as any).additional_kwargs?.tool_calls

        if (Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            const id = String(tc?.id ?? '')
            if (!id || seenToolCallIds.has(id)) continue
            seenToolCallIds.add(id)

            const toolName = String(tc?.name ?? 'unknown')
            
            // 知识检索：只发 node 事件，不发 tool 事件
            if (toolName === 'knowledge_search') {
              params.emit({
                type: 'invoke:node-start',
                requestId: state.requestId,
                payload: {
                  nodeId: `knowledge_search:${id}`,
                  nodeKind: 'knowledge_retrieval',
                  label: '知识库检索',
                  uiHint: { component: 'knowledge-search', title: '知识库检索' },
                  inputs: { query: tc?.args?.query }
                }
              })
            } else {
              // 其他工具：发 tool 事件
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

      if (msgType === 'tool' || ToolMessage.isInstance(message)) {
        const toolName = String((message as any).name ?? 'tool')
        const toolCallId = String((message as any).tool_call_id ?? '')
        const resultText = extractTextFromContent((message as any).content)

        // 知识检索：只发 node 事件，不发 tool 事件
        if (toolName === 'knowledge_search') {
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
          // 其他工具：发 tool 事件
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

  const graph = new StateGraph(State)
    .addNode('agent', agentNode)
    .addEdge(START, 'agent')
    .addEdge('agent', END)
    .compile()

  return graph
}
