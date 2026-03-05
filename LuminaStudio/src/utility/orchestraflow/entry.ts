/**
 * OrchestraFlow Utility Process Entry
 *
 * 处理主进程发来的工作流运行请求
 */
import type { MainToOFMessage, OFToMainMessage } from './messages.types'
import { WorkflowInstanceManager } from './manager/workflow-instance-manager'

const parentPort = process.parentPort
if (!parentPort) {
  console.error('[OF.entry] Not running inside a UtilityProcess')
  process.exit(1)
}

// 覆盖 console 方法，将日志转发到主进程
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
}

function sendLog(level: 'log' | 'error' | 'warn' | 'info' | 'debug', args: any[]) {
  const msg = args
    .map((arg) => {
      if (arg instanceof Error) return arg.message
      if (typeof arg === 'object') return JSON.stringify(arg)
      return String(arg)
    })
    .join(' ')

  parentPort?.postMessage({
    type: 'process:log',
    level,
    message: msg,
    timestamp: Date.now()
  } as OFToMainMessage)
}

// 覆盖全局 console
console.log = (...args: any[]) => {
  originalConsole.log.call(console, '[OF]', ...args)
  sendLog('log', args)
}
console.error = (...args: any[]) => {
  originalConsole.error.call(console, '[OF]', ...args)
  sendLog('error', args)
}
console.warn = (...args: any[]) => {
  originalConsole.warn.call(console, '[OF]', ...args)
  sendLog('warn', args)
}
console.info = (...args: any[]) => {
  originalConsole.info.call(console, '[OF]', ...args)
  sendLog('info', args)
}
console.debug = (...args: any[]) => {
  originalConsole.debug.call(console, '[OF]', ...args)
  sendLog('debug', args)
}

// 本地日志对象（用于进程初始化阶段的日志）
const log = {
  info: (msg: string, ...args: any[]) => console.log(`[OF.entry] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[OF.entry] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[OF.entry] ${msg}`, ...args)
}

// 保存 provider 配置，供节点执行时使用
let providerConfigs: Record<string, {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  enabled: boolean
}> = {}

function sendMessage(msg: OFToMainMessage): void {
  parentPort?.postMessage(msg)
}

const workflowManager = new WorkflowInstanceManager(sendMessage)

parentPort.on('message', async (event: { data: MainToOFMessage }) => {
  const msg = event.data

  try {
    switch (msg.type) {
      case 'process:init': {
        log.info('Process initialized with config', msg.config)
        break
      }

      case 'process:shutdown': {
        log.info('Shutdown requested')
        process.exit(0)
        break
      }

      case 'workflow:run': {
        try {
          // 保存 provider 配置
          if (msg.providerConfigs) {
            providerConfigs = msg.providerConfigs
          }
          log.info('Running workflow', { runId: msg.runId, workflowId: msg.workflow.id })
          const result = await workflowManager.runWorkflow(msg.runId, msg.workflow, msg.inputs, providerConfigs)
          sendMessage({
            type: 'workflow:result',
            runId: msg.runId,
            result
          })
          log.info('Workflow completed', { runId: msg.runId, status: result.status })
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          log.error('Workflow run failed', err, { runId: msg.runId })
          sendMessage({
            type: 'workflow:error',
            runId: msg.runId,
            error: errorMsg
          })
        }
        break
      }

      case 'workflow:stop': {
        log.info('Stopping workflow', { runId: msg.runId })
        workflowManager.stopWorkflow(msg.runId)
        break
      }

      default: {
        const unknownType = (msg as any)?.type
        log.warn('Unknown message type', { type: unknownType })
        sendMessage({
          type: 'process:error',
          message: 'Unknown message type',
          details: String(unknownType)
        })
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    log.error('Error handling message', err, { type: msg?.type })
    sendMessage({ type: 'process:error', message: errorMsg })
  }
})

sendMessage({ type: 'process:ready' })
log.info('Process ready')

// Keep alive
setInterval(() => {}, 1000 * 60)
