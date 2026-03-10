/**
 * OrchestraFlow Utility Process Entry
 */
import type { MainToOFMessage, OFToMainMessage } from './messages.types'
import { WorkflowInstanceManager } from './manager/workflow-instance-manager'
import {
  advanceGenerationPhase,
  resolveGenerationApproval,
  rollbackGenerationSession,
  runGenerationStage,
  sendGenerationAgentMessage,
  sendGenerationPrompt,
  updateGenerationAgentConfig
} from './generation/phase-orchestrator'

const parentPort = process.parentPort
if (!parentPort) {
  console.error('[OF.entry] Not running inside a UtilityProcess')
  process.exit(1)
}

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

const log = {
  info: (msg: string, ...args: any[]) => console.log(`[OF.entry] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[OF.entry] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[OF.entry] ${msg}`, ...args)
}

let providerConfigs: Record<
  string,
  {
    id: string
    name: string
    baseUrl: string
    apiKey: string
    enabled: boolean
    defaultHeaders?: Record<string, string>
  }
> = {}

function sendMessage(msg: OFToMainMessage): void {
  parentPort?.postMessage(msg)
}

function emitGenerationEvent(
  event: OFToMainMessage extends { type: 'generation:agent-event'; event: infer T } ? T : never
): void {
  sendMessage({ type: 'generation:agent-event', event } as OFToMainMessage)
}

function notifySessionUpdated(
  session: { id: string; updated_at: number },
  agentId: string,
  requestId?: string
) {
  emitGenerationEvent({
    request_id: requestId || `${session.id}-${agentId}-${session.updated_at}`,
    session_id: session.id,
    agent_id: agentId as never,
    type: 'session-updated',
    created_at: Date.now()
  })
}

const workflowManager = new WorkflowInstanceManager(sendMessage)

function sendGenerationError(error: unknown, requestId?: string) {
  sendMessage({
    type: 'generation:error',
    error: error instanceof Error ? error.message : String(error),
    requestId
  })
}

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
          if (msg.providerConfigs) providerConfigs = msg.providerConfigs
          const result = await workflowManager.runWorkflow(
            msg.runId,
            msg.workflow,
            msg.inputs,
            providerConfigs
          )
          sendMessage({ type: 'workflow:result', runId: msg.runId, result })
        } catch (err) {
          sendMessage({
            type: 'workflow:error',
            runId: msg.runId,
            error: err instanceof Error ? err.message : String(err)
          })
        }
        break
      }

      case 'workflow:stop': {
        workflowManager.stopWorkflow(msg.runId)
        break
      }

      case 'node:debug-run': {
        try {
          if (msg.providerConfigs) providerConfigs = msg.providerConfigs
          const result = await workflowManager.runNodeDebug(
            msg.workflow,
            msg.nodeId,
            msg.inputs,
            providerConfigs,
            msg.scopePath
          )
          sendMessage({ type: 'node:debug-result', requestId: msg.requestId, result })
        } catch (err) {
          sendMessage({
            type: 'node:debug-error',
            requestId: msg.requestId,
            error: err instanceof Error ? err.message : String(err)
          })
        }
        break
      }

      case 'generation:send-prompt': {
        try {
          emitGenerationEvent({
            request_id: `${msg.session.id}-draft-start`,
            session_id: msg.session.id,
            agent_id: 'draft_chat',
            type: 'message-start',
            created_at: Date.now(),
            payload: { prompt: msg.prompt }
          })
          const session = await sendGenerationPrompt(msg.session, msg.prompt, msg.providerConfigs)
          notifySessionUpdated(session, 'draft_chat')
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err)
        }
        break
      }

      case 'generation:advance-phase': {
        try {
          const session = await advanceGenerationPhase(msg.session, msg.phase, msg.providerConfigs)
          notifySessionUpdated(
            session,
            msg.phase === 'plan'
              ? 'plan_panel'
              : msg.phase === 'validate'
                ? 'plan_panel'
                : 'topology_graph'
          )
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err)
        }
        break
      }

      case 'generation:rollback-checkpoint': {
        try {
          const session = await rollbackGenerationSession(
            msg.session,
            msg.checkpointId,
            msg.providerConfigs
          )
          notifySessionUpdated(session, 'plan_panel')
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err)
        }
        break
      }

      case 'generation:send-agent-message': {
        try {
          emitGenerationEvent({
            request_id: msg.requestId,
            session_id: msg.session.id,
            agent_id: msg.agentId,
            type: 'message-start',
            created_at: Date.now(),
            payload: { input: msg.input }
          })
          const session = await sendGenerationAgentMessage(
            msg.session,
            msg.agentId,
            msg.input,
            msg.providerConfigs
          )
          emitGenerationEvent({
            request_id: msg.requestId,
            session_id: session.id,
            agent_id: msg.agentId,
            type: 'message-complete',
            created_at: Date.now()
          })
          notifySessionUpdated(session, msg.agentId, msg.requestId)
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err, msg.requestId)
        }
        break
      }

      case 'generation:resolve-approval': {
        try {
          const session = await resolveGenerationApproval(
            msg.session,
            msg.approvalId,
            msg.decision,
            msg.note,
            msg.providerConfigs
          )
          emitGenerationEvent({
            request_id: msg.requestId,
            session_id: session.id,
            agent_id: 'draft_chat',
            type: 'approval-updated',
            created_at: Date.now(),
            payload: { approvalId: msg.approvalId, decision: msg.decision }
          })
          notifySessionUpdated(session, 'draft_chat', msg.requestId)
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err, msg.requestId)
        }
        break
      }

      case 'generation:run-stage': {
        try {
          const session = await runGenerationStage(msg.session, msg.stage, msg.providerConfigs)
          emitGenerationEvent({
            request_id: msg.requestId,
            session_id: session.id,
            agent_id:
              msg.stage === 'draft'
                ? 'draft_chat'
                : msg.stage === 'topology'
                  ? 'topology_graph'
                  : 'plan_panel',
            type: 'artifact-updated',
            created_at: Date.now(),
            payload: { stage: msg.stage }
          })
          notifySessionUpdated(
            session,
            msg.stage === 'draft'
              ? 'draft_chat'
              : msg.stage === 'topology'
                ? 'topology_graph'
                : 'plan_panel',
            msg.requestId
          )
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err, msg.requestId)
        }
        break
      }

      case 'generation:update-agent-config': {
        try {
          const session = await updateGenerationAgentConfig(
            msg.session,
            msg.agentId,
            msg.patch,
            msg.providerConfigs
          )
          emitGenerationEvent({
            request_id: `${msg.session.id}-${msg.agentId}-config`,
            session_id: session.id,
            agent_id: msg.agentId,
            type: 'artifact-updated',
            created_at: Date.now(),
            payload: { kind: 'agent-config' }
          })
          notifySessionUpdated(session, msg.agentId)
          sendMessage({ type: 'generation:session', session })
        } catch (err) {
          sendGenerationError(err)
        }
        break
      }

      default: {
        const unknownType = (msg as { type?: string })?.type
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
setInterval(() => {}, 1000 * 60)
