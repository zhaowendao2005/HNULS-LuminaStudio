import { createAgent } from 'langchain'
import type {
  LangchainClientAgentCreateConfig,
  LangchainClientChatMessage,
  LangchainClientLangsmithConfig,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import { logger } from '@main/services/logger'
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from '@langchain/core/messages'
import { buildChatModel } from './model-factory'
import { buildAgentTools } from './tools'

const log = logger.scope('LangchainClient.AgentManager')

const DEFAULT_SYSTEM_PROMPT = `你是一个知识库问答助手。
当用户的问题需要查阅资料时，优先调用工具 knowledge_search 进行检索，然后基于检索结果回答。
如果检索结果不足以回答，明确说明不确定/缺少信息，并给出建议的补充查询方向。`

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '[Unserializable]'
  }
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    // LangChain content blocks: { type: 'text', text: '...' }
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

export class AgentManager {
  private knowledgeApiUrl = ''
  private agents = new Map<string, any>()
  private abortControllers = new Map<string, AbortController>()

  constructor(private readonly send: (msg: LangchainClientToMainMessage) => void) {}

  init(params: { knowledgeApiUrl: string; langsmith?: LangchainClientLangsmithConfig }): void {
    this.knowledgeApiUrl = params.knowledgeApiUrl

    if (params.langsmith) {
      this.enableLangsmith(params.langsmith)
    } else {
      log.info('LangSmith disabled')
    }

    log.info('Initialized', {
      knowledgeApiUrl: this.knowledgeApiUrl
    })
  }

  private enableLangsmith(langsmith: LangchainClientLangsmithConfig): void {
    // Important: do NOT log apiKey
    process.env.LANGCHAIN_TRACING_V2 = 'true'
    process.env.LANGCHAIN_API_KEY = langsmith.apiKey
    process.env.LANGCHAIN_PROJECT = langsmith.project ?? 'LuminaStudio'

    log.info('LangSmith enabled', {
      project: process.env.LANGCHAIN_PROJECT
    })
  }

  async createAgent(agentId: string, config: LangchainClientAgentCreateConfig): Promise<void> {
    log.info('Creating agent', {
      agentId,
      modelId: config.modelId,
      providerBaseUrl: config.provider.baseUrl,
      hasRetrieval: Boolean(config.retrieval)
    })

    const model = buildChatModel(config)
    const tools = buildAgentTools({ knowledgeApiUrl: this.knowledgeApiUrl, config })

    const agent = createAgent({
      model,
      tools,
      systemPrompt: config.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT
    })

    this.agents.set(agentId, agent)
    this.send({ type: 'agent:created', agentId })

    log.info('Agent created', { agentId })
  }

  destroyAgent(agentId: string): void {
    const existed = this.agents.delete(agentId)
    this.send({ type: 'agent:destroyed', agentId })

    log.info('Agent destroyed', { agentId, existed })
  }

  abort(requestId: string): void {
    const controller = this.abortControllers.get(requestId)
    if (!controller) {
      log.info('Abort ignored (request not found)', { requestId })
      return
    }

    log.info('Aborting request', { requestId })
    controller.abort()
  }

  async invoke(params: {
    agentId: string
    requestId: string
    input: string
    history?: LangchainClientChatMessage[]
  }): Promise<void> {
    const { agentId, requestId, input, history } = params

    const agent = this.agents.get(agentId)
    if (!agent) {
      this.send({ type: 'invoke:error', requestId, message: `Agent not found: ${agentId}` })
      return
    }

    const abortController = new AbortController()
    this.abortControllers.set(requestId, abortController)

    this.send({ type: 'invoke:start', requestId, agentId })
    log.info('Invoke started', { requestId, agentId })

    const messages = toMessages(history, input)

    let fullText = ''
    let stepIndex = 0
    const seenToolCallIds = new Set<string>()

    try {
      const stream = await agent.stream(
        { messages },
        {
          streamMode: ['messages', 'updates'],
          signal: abortController.signal
        }
      )

      for await (const chunk of stream as any) {
        const [mode, value] = chunk as [string, any]

        if (mode === 'updates') {
          stepIndex += 1
          const nodeNames = value && typeof value === 'object' ? Object.keys(value) : []
          this.send({ type: 'invoke:step-complete', requestId, stepIndex, nodeNames })
          continue
        }

        if (mode !== 'messages') continue

        const [message] = value as [BaseMessage, Record<string, unknown>]
        const msgType = (message as any)?._getType?.() as string | undefined

        if (msgType === 'ai') {
          const delta = extractTextFromContent((message as any).content)
          if (delta) {
            fullText += delta
            this.send({ type: 'invoke:text-delta', requestId, delta })
          }

          // Tool calls (dedupe by id)
          const toolCalls =
            (message as any).tool_calls ??
            (message as any).toolCalls ??
            (message as any).additional_kwargs?.tool_calls

          if (Array.isArray(toolCalls)) {
            for (const tc of toolCalls) {
              const id = String(tc?.id ?? '')
              if (!id || seenToolCallIds.has(id)) continue
              seenToolCallIds.add(id)

              this.send({
                type: 'invoke:tool-start',
                requestId,
                toolName: String(tc?.name ?? 'unknown'),
                toolArgs: tc?.args
              })

              log.info('Tool call detected', {
                requestId,
                toolName: String(tc?.name ?? 'unknown'),
                toolCallId: id,
                toolArgs: safeStringify(tc?.args)
              })
            }
          }

          continue
        }

        if (msgType === 'tool' || ToolMessage.isInstance(message)) {
          const toolName = String((message as any).name ?? 'tool')
          const resultText = extractTextFromContent((message as any).content)

          this.send({
            type: 'invoke:tool-result',
            requestId,
            toolName,
            result: resultText || (message as any).content
          })

          log.info('Tool result received', {
            requestId,
            toolName,
            resultPreview: truncateForLog(
              resultText || safeStringify((message as any).content),
              200
            )
          })
        }
      }

      this.send({ type: 'invoke:finish', requestId, finishReason: 'stop', fullText })
      log.info('Invoke finished', { requestId, agentId, fullTextLen: fullText.length })
    } catch (error: any) {
      const isAbort = abortController.signal.aborted || error?.name === 'AbortError'
      if (isAbort) {
        this.send({ type: 'invoke:finish', requestId, finishReason: 'aborted', fullText })
        log.info('Invoke aborted', { requestId, agentId, fullTextLen: fullText.length })
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      this.send({ type: 'invoke:error', requestId, message, stack: error?.stack })
      this.send({ type: 'invoke:finish', requestId, finishReason: 'error', fullText })

      log.error('Invoke failed', error, { requestId, agentId })
    } finally {
      this.abortControllers.delete(requestId)
    }
  }
}

function truncateForLog(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}
