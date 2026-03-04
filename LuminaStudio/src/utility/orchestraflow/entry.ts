/**
 * OrchestraFlow Utility Process Entry
 *
 * 处理主进程发来的工作流运行请求
 */
import type { MainToOFMessage, OFToMainMessage } from './messages.types'
import { WorkflowInstanceManager } from './manager/workflow-instance-manager'

const log = {
  info: (msg: string, ...args: any[]) => console.log(`[OF.entry] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[OF.entry] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[OF.entry] ${msg}`, ...args)
}

const parentPort = process.parentPort
if (!parentPort) {
  log.error('Not running inside a UtilityProcess')
  process.exit(1)
}

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
          log.info('Running workflow', { runId: msg.runId, workflowId: msg.workflow.id })
          const result = await workflowManager.runWorkflow(msg.runId, msg.workflow, msg.inputs)
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
