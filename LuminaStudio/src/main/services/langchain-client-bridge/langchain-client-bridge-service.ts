import { utilityProcess } from 'electron'
import type { UtilityProcess } from 'electron'
import path from 'path'
import { randomUUID } from 'crypto'
import { logger } from '../logger'
import type {
  LangchainClientAgentCreateConfig,
  LangchainClientToMainMessage,
  MainToLangchainClientMessage
} from '@shared/langchain-client.types'
import { LANGCHAIN_CLIENT_DEV_CONFIG } from './dev-config'

const log = logger.scope('LangchainClientBridge')

interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
  timeoutId: NodeJS.Timeout
}

function redactKey(apiKey: string | undefined): string {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '***'
  return `${apiKey.slice(0, 3)}***${apiKey.slice(-3)}`
}

function redactCreateConfig(config: LangchainClientAgentCreateConfig): Record<string, unknown> {
  return {
    modelId: config.modelId,
    provider: {
      baseUrl: config.provider.baseUrl,
      apiKey: config.provider.apiKey ? redactKey(config.provider.apiKey) : undefined,
      hasDefaultHeaders: Boolean(config.provider.defaultHeaders)
    },
    hasRetrieval: Boolean(config.retrieval),
    retrieval: config.retrieval
      ? {
          knowledgeBaseId: config.retrieval.knowledgeBaseId,
          tableName: config.retrieval.tableName,
          k: config.retrieval.k ?? null,
          ef: config.retrieval.ef ?? null,
          rerankModelId: config.retrieval.rerankModelId ?? null,
          rerankTopN: config.retrieval.rerankTopN ?? null
        }
      : null,
    hasSystemPrompt: Boolean(config.systemPrompt && config.systemPrompt.trim())
  }
}

export class LangchainClientBridgeService {
  private process: UtilityProcess | null = null
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null

  private pendingCreate: Map<string, PendingRequest<void>> = new Map()

  async spawn(): Promise<void> {
    if (this.process) {
      log.info('Process already spawned')
      return
    }

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })

    const modulePath = path.join(__dirname, 'utility/langchain-client.js')
    log.info('Spawning utility process', { modulePath })

    this.process = utilityProcess.fork(modulePath)

    this.process.on('message', (msg: LangchainClientToMainMessage) => {
      this.handleMessage(msg)
    })

    this.process.on('exit', (code) => {
      log.info('Process exited', { code })
      this.process = null
    })

    await this.readyPromise
    log.info('Process ready')
  }

  kill(): void {
    if (!this.process) return
    log.info('Killing utility process')
    this.process.kill()
    this.process = null
  }

  init(params: {
    knowledgeApiUrl: string
    langsmith?: { apiKey: string; project?: string }
  }): void {
    this.send({
      type: 'process:init',
      knowledgeApiUrl: params.knowledgeApiUrl,
      langsmith: params.langsmith
    })

    log.info('Sent process:init', {
      knowledgeApiUrl: params.knowledgeApiUrl,
      langsmithEnabled: Boolean(params.langsmith),
      langsmithProject: params.langsmith?.project ?? null
    })
  }

  async createAgent(
    agentId: string,
    config: LangchainClientAgentCreateConfig,
    timeoutMs = 30000
  ): Promise<void> {
    if (this.pendingCreate.has(agentId)) {
      throw new Error(`Agent create already pending: ${agentId}`)
    }

    log.info('Sending agent:create', { agentId, config: redactCreateConfig(config) })

    const requestPromise = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCreate.delete(agentId)
        reject(new Error('agent:create timeout'))
      }, timeoutMs)

      this.pendingCreate.set(agentId, { resolve, reject, timeoutId })

      this.send({ type: 'agent:create', agentId, config })
    })

    await requestPromise
  }

  destroyAgent(agentId: string): void {
    log.info('Sending agent:destroy', { agentId })
    this.send({ type: 'agent:destroy', agentId })
  }

  invoke(params: { agentId: string; requestId?: string; input: string }): string {
    const requestId = params.requestId ?? randomUUID()

    log.info('Sending agent:invoke', {
      agentId: params.agentId,
      requestId
    })

    this.send({
      type: 'agent:invoke',
      agentId: params.agentId,
      requestId,
      input: params.input
    })

    return requestId
  }

  abort(requestId: string): void {
    log.info('Sending agent:abort', { requestId })
    this.send({ type: 'agent:abort', requestId })
  }

  private send(msg: MainToLangchainClientMessage): void {
    if (!this.process) {
      throw new Error('LangchainClient process not spawned')
    }
    this.process.postMessage(msg)
  }

  private handleMessage(msg: LangchainClientToMainMessage): void {
    switch (msg.type) {
      case 'process:ready':
        this.readyResolve?.()
        break

      case 'process:error':
        log.error('Utility process error', undefined, {
          message: msg.message,
          details: msg.details
        })
        break

      case 'agent:created': {
        const pending = this.pendingCreate.get(msg.agentId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingCreate.delete(msg.agentId)
          pending.resolve()
        }
        log.info('Agent created', { agentId: msg.agentId })
        break
      }

      case 'agent:create-failed': {
        const pending = this.pendingCreate.get(msg.agentId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingCreate.delete(msg.agentId)
          pending.reject(new Error(msg.error))
        }
        log.error('Agent create failed', undefined, { agentId: msg.agentId, error: msg.error })
        break
      }

      case 'agent:destroyed':
        log.info('Agent destroyed', { agentId: msg.agentId })
        break

      case 'invoke:start':
        log.info('Invoke started', { requestId: msg.requestId, agentId: msg.agentId })
        break

      case 'invoke:tool-start':
        log.info('Tool start', { requestId: msg.requestId, toolName: msg.toolName })
        break

      case 'invoke:tool-result': {
        const preview =
          typeof msg.result === 'string'
            ? msg.result.slice(0, 200)
            : JSON.stringify(msg.result)?.slice(0, 200)
        log.info('Tool result', { requestId: msg.requestId, toolName: msg.toolName, preview })
        break
      }

      case 'invoke:step-complete':
        log.info('Step complete', {
          requestId: msg.requestId,
          stepIndex: msg.stepIndex,
          nodeNames: msg.nodeNames ?? []
        })
        break

      case 'invoke:finish':
        log.info('Invoke finished', {
          requestId: msg.requestId,
          finishReason: msg.finishReason,
          fullTextPreview: msg.fullText.slice(0, 500)
        })
        break

      case 'invoke:error':
        log.error('Invoke error', undefined, {
          requestId: msg.requestId,
          message: msg.message
        })
        break

      case 'invoke:text-delta':
        // MVP: do not log each delta to avoid log explosion
        break

      default:
        log.warn('Unknown message from utility process', { type: (msg as any).type })
    }
  }

  /**
   * MVP：在不接入前端的情况下，自动跑通关键链路。
   *
   * - 配置写在 dev-config.ts
   * - 全部过程使用 info 日志输出关键环节
   */
  async runDevMvpIfEnabled(): Promise<void> {
    const cfg = LANGCHAIN_CLIENT_DEV_CONFIG

    if (!cfg.enabled) {
      log.info('Dev MVP disabled (LANGCHAIN_CLIENT_DEV_CONFIG.enabled=false)')
      return
    }

    if (cfg.agentConfig.provider.apiKey === 'FILL_ME') {
      log.warn('Dev MVP enabled but provider.apiKey is not set (still FILL_ME)')
    }

    try {
      await this.spawn()
      this.init({ knowledgeApiUrl: cfg.knowledgeApiUrl, langsmith: cfg.langsmith })
      await this.createAgent(cfg.agentId, cfg.agentConfig)

      if (cfg.autoInvoke?.input) {
        this.invoke({ agentId: cfg.agentId, input: cfg.autoInvoke.input })
      }
    } catch (error) {
      log.error('Dev MVP failed', error)
    }
  }
}

export const langchainClientBridge = new LangchainClientBridgeService()
