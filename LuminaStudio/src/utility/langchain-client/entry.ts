import { logger } from '@main/services/logger'
import type {
  LangchainClientToMainMessage,
  MainToLangchainClientMessage
} from '@shared/langchain-client.types'
import { AgentManager } from './agent-manager'

const log = logger.scope('LangchainClient.entry')

const parentPort = process.parentPort
if (!parentPort) {
  log.error('Not running inside a UtilityProcess')
  process.exit(1)
}

function sendMessage(msg: LangchainClientToMainMessage): void {
  parentPort?.postMessage(msg)
}

const agentManager = new AgentManager(sendMessage)

parentPort.on('message', async (event: { data: MainToLangchainClientMessage }) => {
  const msg = event.data

  try {
    switch (msg.type) {
      case 'process:init': {
        agentManager.init({
          knowledgeApiUrl: msg.knowledgeApiUrl,
          langsmith: msg.langsmith
        })
        break
      }

      case 'process:shutdown': {
        log.info('Shutdown requested')
        process.exit(0)
        break
      }

      case 'agent:create': {
        try {
          await agentManager.createAgent(msg.agentId, msg.config)
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          sendMessage({ type: 'agent:create-failed', agentId: msg.agentId, error: errorMsg })
          log.error('Agent create failed', err, { agentId: msg.agentId })
        }
        break
      }

      case 'agent:destroy': {
        agentManager.destroyAgent(msg.agentId)
        break
      }

      case 'agent:invoke': {
        // fire-and-forget; streaming events are sent back via sendMessage
        agentManager
          .invoke({
            agentId: msg.agentId,
            requestId: msg.requestId,
            input: msg.input,
            history: msg.history
          })
          .catch((err) => {
            const errorMsg = err instanceof Error ? err.message : String(err)
            sendMessage({ type: 'invoke:error', requestId: msg.requestId, message: errorMsg })
            log.error('Invoke unexpected failure', err, {
              requestId: msg.requestId,
              agentId: msg.agentId
            })
          })
        break
      }

      case 'agent:abort': {
        agentManager.abort(msg.requestId)
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
