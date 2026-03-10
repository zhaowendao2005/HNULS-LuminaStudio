/**
 * OrchestraFlow Bridge Service
 */
import { utilityProcess } from 'electron'
import type { UtilityProcess } from 'electron'
import path from 'path'
import { randomUUID } from 'crypto'
import { logger } from '../logger'
import type {
  OFWorkflow,
  OFWorkflowRunResult,
  OFNodeTracing,
  OFNodeDebugResult,
  OFGenerationPhase,
  OFGenerationSession,
  OFGenerationAgentId,
  OFGenerationAgentEvent,
  OFGenerationAgentRuntimeConfig
} from '@shared/Orchestraflow-types'
import type { OFToMainMessage, MainToOFMessage } from '@utility/orchestraflow/messages.types'

const log = logger.scope('OrchestraflowBridge')

interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
  timeoutId: NodeJS.Timeout
}

export class OrchestraflowBridgeService {
  private process: UtilityProcess | null = null
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null

  private pendingRuns: Map<string, PendingRequest<OFWorkflowRunResult>> = new Map()
  private pendingNodeDebugs: Map<string, PendingRequest<OFNodeDebugResult>> = new Map()
  private pendingGenerationRequest: PendingRequest<OFGenerationSession> | null = null
  private progressCallbacks: Array<(runId: string, progress: OFNodeTracing) => void> = []
  private messageHandlers: Array<(msg: OFToMainMessage) => void> = []
  private generationEventHandlers: Array<(event: OFGenerationAgentEvent) => void> = []

  onProgress(callback: (runId: string, progress: OFNodeTracing) => void): () => void {
    this.progressCallbacks.push(callback)
    return () => {
      const idx = this.progressCallbacks.indexOf(callback)
      if (idx >= 0) this.progressCallbacks.splice(idx, 1)
    }
  }

  onMessage(handler: (msg: OFToMainMessage) => void): () => void {
    this.messageHandlers.push(handler)
    return () => {
      const idx = this.messageHandlers.indexOf(handler)
      if (idx >= 0) this.messageHandlers.splice(idx, 1)
    }
  }

  onGenerationEvent(handler: (event: OFGenerationAgentEvent) => void): () => void {
    this.generationEventHandlers.push(handler)
    return () => {
      const idx = this.generationEventHandlers.indexOf(handler)
      if (idx >= 0) this.generationEventHandlers.splice(idx, 1)
    }
  }

  async spawn(): Promise<void> {
    if (this.process) {
      log.info('Process already spawned')
      return
    }

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })

    const modulePath = path.join(__dirname, 'utility/orchestraflow.js')
    log.info('Spawning utility process', { modulePath })
    this.process = utilityProcess.fork(modulePath)

    this.process.on('message', (msg: OFToMainMessage) => {
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
    this.pendingRuns.clear()
    this.pendingNodeDebugs.clear()
    this.pendingGenerationRequest = null
    this.progressCallbacks = []
    this.messageHandlers = []
    this.generationEventHandlers = []
  }

  init(): void {
    this.send({ type: 'process:init', config: {} })
    log.info('Sent process:init')
  }

  async runWorkflow(
    workflowId: string,
    workflow: OFWorkflow,
    inputs: Record<string, unknown>,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 1800000
  ): Promise<OFWorkflowRunResult> {
    const runId = randomUUID()
    const requestPromise = new Promise<OFWorkflowRunResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRuns.delete(runId)
        reject(new Error('workflow:run timeout'))
      }, timeoutMs)
      this.pendingRuns.set(runId, { resolve, reject, timeoutId })
      this.send({ type: 'workflow:run', runId, workflow, inputs, providerConfigs })
    })
    return requestPromise
  }

  async runNodeDebug(
    workflow: OFWorkflow,
    nodeId: string,
    inputs: Record<string, unknown>,
    scopePath?: string[],
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 600000
  ): Promise<OFNodeDebugResult> {
    const requestId = randomUUID()
    const requestPromise = new Promise<OFNodeDebugResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingNodeDebugs.delete(requestId)
        reject(new Error('node:debug-run timeout'))
      }, timeoutMs)
      this.pendingNodeDebugs.set(requestId, { resolve, reject, timeoutId })
      this.send({
        type: 'node:debug-run',
        requestId,
        workflow,
        nodeId,
        inputs,
        scopePath,
        providerConfigs
      })
    })
    return requestPromise
  }

  stopWorkflow(runId: string): void {
    this.send({ type: 'workflow:stop', runId })
  }

  async sendGenerationPrompt(
    session: OFGenerationSession,
    prompt: string,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    return this.runGenerationRequest(
      () => ({ type: 'generation:send-prompt', session, prompt, providerConfigs }),
      timeoutMs
    )
  }

  async sendGenerationAgentMessage(
    session: OFGenerationSession,
    agentId: OFGenerationAgentId,
    input: string,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    const requestId = randomUUID()
    return this.runGenerationRequest(
      () => ({
        type: 'generation:send-agent-message',
        session,
        agentId,
        input,
        requestId,
        providerConfigs
      }),
      timeoutMs
    )
  }

  async resolveGenerationApproval(
    session: OFGenerationSession,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    const requestId = randomUUID()
    return this.runGenerationRequest(
      () => ({
        type: 'generation:resolve-approval',
        session,
        approvalId,
        decision,
        note,
        requestId,
        providerConfigs
      }),
      timeoutMs
    )
  }

  async runGenerationStage(
    session: OFGenerationSession,
    stage: 'draft' | 'plan' | 'topology' | 'validation',
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    const requestId = randomUUID()
    return this.runGenerationRequest(
      () => ({ type: 'generation:run-stage', session, stage, requestId, providerConfigs }),
      timeoutMs
    )
  }

  async advanceGenerationPhase(
    session: OFGenerationSession,
    phase: OFGenerationPhase,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    return this.runGenerationRequest(
      () => ({ type: 'generation:advance-phase', session, phase, providerConfigs }),
      timeoutMs
    )
  }

  async rollbackGenerationCheckpoint(
    session: OFGenerationSession,
    checkpointId: string,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    return this.runGenerationRequest(
      () => ({ type: 'generation:rollback-checkpoint', session, checkpointId, providerConfigs }),
      timeoutMs
    )
  }

  async updateGenerationAgentConfig(
    session: OFGenerationSession,
    agentId: OFGenerationAgentId,
    patch: Partial<OFGenerationAgentRuntimeConfig>,
    providerConfigs?: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        apiMode?: 'auto' | 'responses' | 'chat-completions'
        enabled: boolean
        defaultHeaders?: Record<string, string>
      }
    >,
    timeoutMs = 30000
  ): Promise<OFGenerationSession> {
    return this.runGenerationRequest(
      () => ({ type: 'generation:update-agent-config', session, agentId, patch, providerConfigs }),
      timeoutMs
    )
  }

  private async runGenerationRequest(
    buildMessage: () => MainToOFMessage,
    timeoutMs: number
  ): Promise<OFGenerationSession> {
    return new Promise<OFGenerationSession>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingGenerationRequest = null
        reject(new Error('generation request timeout'))
      }, timeoutMs)
      this.pendingGenerationRequest = { resolve, reject, timeoutId }
      this.send(buildMessage())
    })
  }

  private send(msg: MainToOFMessage): void {
    if (!this.process) throw new Error('Orchestraflow process not spawned')
    this.process.postMessage(msg)
  }

  private handleMessage(msg: OFToMainMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(msg)
      } catch (err) {
        log.error('Bridge message handler error', err)
      }
    }

    switch (msg.type) {
      case 'process:ready':
        this.readyResolve?.()
        break
      case 'process:error':
        log.error('Utility process error', undefined, { message: msg.message, details: msg.details })
        break
      case 'process:log': {
        const logMsg = `[OF] ${msg.message}`
        switch (msg.level) {
          case 'error':
            log.error(logMsg)
            break
          case 'warn':
            log.warn(logMsg)
            break
          case 'info':
            log.info(logMsg)
            break
          case 'debug':
            log.debug(logMsg)
            break
          default:
            log.info(logMsg)
        }
        break
      }
      case 'workflow:progress':
        for (const callback of this.progressCallbacks) {
          try {
            callback(msg.runId, msg.progress)
          } catch (err) {
            log.error('Progress callback error', err)
          }
        }
        break
      case 'workflow:result': {
        const pending = this.pendingRuns.get(msg.runId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingRuns.delete(msg.runId)
          pending.resolve(msg.result)
        }
        break
      }
      case 'workflow:error': {
        const pending = this.pendingRuns.get(msg.runId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingRuns.delete(msg.runId)
          pending.reject(new Error(msg.error))
        }
        break
      }
      case 'node:debug-result': {
        const pending = this.pendingNodeDebugs.get(msg.requestId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingNodeDebugs.delete(msg.requestId)
          pending.resolve(msg.result)
        }
        break
      }
      case 'node:debug-error': {
        const pending = this.pendingNodeDebugs.get(msg.requestId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingNodeDebugs.delete(msg.requestId)
          pending.reject(new Error(msg.error))
        }
        break
      }
      case 'generation:agent-event':
        for (const handler of this.generationEventHandlers) {
          try {
            handler(msg.event)
          } catch (err) {
            log.error('Generation event handler error', err)
          }
        }
        break
      case 'generation:session': {
        if (this.pendingGenerationRequest) {
          clearTimeout(this.pendingGenerationRequest.timeoutId)
          const pending = this.pendingGenerationRequest
          this.pendingGenerationRequest = null
          pending.resolve(msg.session)
        }
        break
      }
      case 'generation:error': {
        if (this.pendingGenerationRequest) {
          clearTimeout(this.pendingGenerationRequest.timeoutId)
          const pending = this.pendingGenerationRequest
          this.pendingGenerationRequest = null
          pending.reject(new Error(msg.error))
        }
        break
      }
      default:
        log.warn('Unknown message from utility process', { type: (msg as { type?: string }).type })
    }
  }
}

export const orchestraflowBridge = new OrchestraflowBridgeService()
