/**
 * ======================================================================
 * OrchestraFlow Bridge Service
 * ======================================================================
 *
 * 职责：
 * - 管理 orchestraflow Utility 子进程的生命周期
 * - 处理主进程与 Utility 进程之间的 IPC 消息
 * - 提供工作流运行/停止接口
 * - 转发进度事件
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
  OFNodeDebugResult
} from '@shared/Orchestraflow-types'
import type { OFToMainMessage } from '@utility/orchestraflow/messages.types'
import type { MainToOFMessage } from '@utility/orchestraflow/messages.types'

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
  private progressCallbacks: Array<(runId: string, progress: OFNodeTracing) => void> = []
  private messageHandlers: Array<(msg: OFToMainMessage) => void> = []

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
    this.progressCallbacks = []
    this.messageHandlers = []
  }

  init(): void {
    this.send({
      type: 'process:init',
      config: {}
    })
    log.info('Sent process:init')
  }

  async runWorkflow(
    workflowId: string,
    workflow: OFWorkflow,
    inputs: Record<string, any>,
    providerConfigs?: Record<
      string,
      { id: string; name: string; baseUrl: string; apiKey: string; enabled: boolean }
    >,
    timeoutMs = 1800000
  ): Promise<OFWorkflowRunResult> {
    const runId = randomUUID()

    log.info('Running workflow', { runId, workflowId })

    const requestPromise = new Promise<OFWorkflowRunResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRuns.delete(runId)
        reject(new Error('workflow:run timeout'))
      }, timeoutMs)

      this.pendingRuns.set(runId, { resolve, reject, timeoutId })

      this.send({
        type: 'workflow:run',
        runId,
        workflow,
        inputs,
        providerConfigs
      })
    })

    return requestPromise
  }

  async runNodeDebug(
    workflow: OFWorkflow,
    nodeId: string,
    inputs: Record<string, any>,
    scopePath?: string[],
    providerConfigs?: Record<
      string,
      { id: string; name: string; baseUrl: string; apiKey: string; enabled: boolean }
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
    log.info('Stopping workflow', { runId })
    this.send({
      type: 'workflow:stop',
      runId
    })
  }

  private send(msg: MainToOFMessage): void {
    if (!this.process) {
      throw new Error('Orchestraflow process not spawned')
    }
    this.process.postMessage(msg)
  }

  private handleMessage(msg: OFToMainMessage): void {
    // Notify external subscribers first
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
        log.error('Utility process error', undefined, {
          message: msg.message,
          details: msg.details
        })
        break

      case 'process:log': {
        // 转发 utility 进程的日志到主进程 logger
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

      case 'workflow:progress': {
        log.info('Workflow progress', {
          runId: msg.runId,
          nodeId: msg.progress.nodeId,
          status: msg.progress.status
        })
        for (const callback of this.progressCallbacks) {
          try {
            callback(msg.runId, msg.progress)
          } catch (err) {
            log.error('Progress callback error', err)
          }
        }
        break
      }

      case 'workflow:result': {
        const pending = this.pendingRuns.get(msg.runId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingRuns.delete(msg.runId)
          pending.resolve(msg.result)
        }
        log.info('Workflow result', {
          runId: msg.runId,
          status: msg.result.status
        })
        break
      }

      case 'workflow:error': {
        const pending = this.pendingRuns.get(msg.runId)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingRuns.delete(msg.runId)
          pending.reject(new Error(msg.error))
        }
        log.error('Workflow error', undefined, {
          runId: msg.runId,
          error: msg.error
        })
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

      default:
        log.warn('Unknown message from utility process', { type: (msg as any).type })
    }
  }
}

export const orchestraflowBridge = new OrchestraflowBridgeService()
