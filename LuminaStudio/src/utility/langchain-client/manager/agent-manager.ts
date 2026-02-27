import type {
  LangchainClientAgentCreateConfig,
  LangchainClientChatMessage,
  LangchainClientLangsmithConfig,
  LangchainClientRetrievalConfig,
  LangchainClientToMainMessage,
  UserInteractionResponsePayload
} from '@shared/langchain-client.types'
import { logger } from '@main/services/logger'
import { createAgentRuntime } from '../factory'
import { resolveModelDefinition } from '../models'
import { AsyncLocalStorage } from 'node:async_hooks'

const log = logger.scope('LangchainClient.AgentManager')

interface AgentInstance {
  runtime: ReturnType<typeof createAgentRuntime>
  graph: any
  systemPrompt: string
}

/**
 * 用户交互待处理项（Promise resolve/reject 对）
 */
interface PendingInteraction {
  resolve: (response: UserInteractionResponsePayload) => void
  reject: (error: Error) => void
}

export class AgentManager {
  private knowledgeApiUrl = ''
  private agents = new Map<string, AgentInstance>()
  private abortControllers = new Map<string, AbortController>()
  private activeRequests = new Map<string, string>()

  /** 用户交互等待注册表：interactionId → pending Promise */
  private pendingInteractions = new Map<string, PendingInteraction>()

  private readonly invokeContext = new AsyncLocalStorage<{
    retrieval?: LangchainClientRetrievalConfig
  }>()

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

    const modelDef = resolveModelDefinition()
    const systemPrompt = config.systemPrompt?.trim() || modelDef.systemPrompt

    const runtime = createAgentRuntime({
      config,
      knowledgeApiUrl: this.knowledgeApiUrl,
      getRetrievalConfig: () => this.invokeContext.getStore()?.retrieval,
      systemPrompt
    })

    const graph = modelDef.buildGraph({
      runtime,
      emit: this.send,
      modelConfig: config.modelConfig,
      waitForResponse: (interactionId: string) => this.waitForResponse(interactionId)
    })

    this.agents.set(agentId, { runtime, graph, systemPrompt })
    this.send({ type: 'agent:created', agentId })

    log.info('Agent created', { agentId })
  }

  destroyAgent(agentId: string): void {
    for (const [requestId, requestAgentId] of this.activeRequests) {
      if (requestAgentId !== agentId) continue
      const controller = this.abortControllers.get(requestId)
      if (controller) {
        log.info('Aborting request due to agent destroy', { requestId, agentId })
        controller.abort()
      }
    }
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

    // 同时 reject 该 request 下所有 pending interactions
    for (const [interactionId, pending] of this.pendingInteractions) {
      pending.reject(new Error('Request aborted'))
      this.pendingInteractions.delete(interactionId)
    }
  }

  /**
   * 等待用户交互响应（由 user-interaction 节点调用）
   *
   * 创建一个 Promise 并注册到 pendingInteractions，
   * 当 entry.ts 收到 user-interaction:response 消息时 resolve。
   */
  waitForResponse(interactionId: string): Promise<UserInteractionResponsePayload> {
    return new Promise<UserInteractionResponsePayload>((resolve, reject) => {
      this.pendingInteractions.set(interactionId, { resolve, reject })
      log.info('Registered pending interaction', { interactionId })
    })
  }

  /**
   * 解析用户交互响应（由 entry.ts 转发 user-interaction:response 时调用）
   */
  resolveUserInteraction(interactionId: string, response: UserInteractionResponsePayload): void {
    const pending = this.pendingInteractions.get(interactionId)
    if (!pending) {
      log.warn('No pending interaction found', { interactionId })
      return
    }

    this.pendingInteractions.delete(interactionId)
    pending.resolve(response)
    log.info('Resolved user interaction', { interactionId, action: response.action })
  }

  async invoke(params: {
    agentId: string
    requestId: string
    input: string
    history?: LangchainClientChatMessage[]
    retrieval?: LangchainClientRetrievalConfig
  }): Promise<void> {
    const { agentId, requestId, input, history, retrieval } = params

    const instance = this.agents.get(agentId)
    if (!instance) {
      this.send({ type: 'invoke:error', requestId, message: `Agent not found: ${agentId}` })
      return
    }

    const abortController = new AbortController()
    this.abortControllers.set(requestId, abortController)
    this.activeRequests.set(requestId, agentId)

    this.send({ type: 'invoke:start', requestId, agentId })
    log.info('Invoke started', {
      requestId,
      agentId,
      retrievalScopes: retrieval?.scopes?.length ?? 0,
      fileKeysCount: retrieval?.scopes?.reduce((acc, s) => acc + (s.fileKeys?.length ?? 0), 0) ?? 0
    })

    try {
      const result = await this.invokeContext.run(
        { retrieval },
        async () =>
          await instance.graph.invoke({
            requestId,
            input,
            history: history ?? [],
            retrieval,
            abortSignal: abortController.signal
          })
      )

      const fullText = (result as any)?.fullText ?? ''
      this.send({ type: 'invoke:finish', requestId, finishReason: 'stop', fullText })
      log.info('Invoke finished', { requestId, agentId, fullTextLen: fullText.length })
    } catch (error: any) {
      const isAbort = abortController.signal.aborted || error?.name === 'AbortError'
      if (isAbort) {
        this.send({ type: 'invoke:finish', requestId, finishReason: 'aborted', fullText: '' })
        log.info('Invoke aborted', { requestId, agentId })
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      this.send({ type: 'invoke:error', requestId, message, stack: error?.stack })
      this.send({ type: 'invoke:finish', requestId, finishReason: 'error', fullText: '' })

      log.error('Invoke failed', error, { requestId, agentId })
    } finally {
      this.abortControllers.delete(requestId)
      this.activeRequests.delete(requestId)
    }
  }
}
