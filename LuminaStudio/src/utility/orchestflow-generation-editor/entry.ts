import { logger } from '@main/services/logger'
import type {
  GenerationUtilityToMainMessage,
  MainToGenerationUtilityMessage
} from './messages.types'
import { streamChat } from './llm-client'

const log = logger.scope('OrchestflowGenerationEditor.entry')
const parentPort = process.parentPort

if (!parentPort) {
  log.error('Not running inside a UtilityProcess')
  process.exit(1)
}

const abortControllers = new Map<string, AbortController>()

function sendMessage(message: GenerationUtilityToMainMessage): void {
  parentPort?.postMessage(message)
}

async function handleInvoke(
  message: Extract<MainToGenerationUtilityMessage, { type: 'chat:invoke' }>
) {
  const abortController = new AbortController()
  abortControllers.set(message.requestId, abortController)

  sendMessage({
    type: 'chat:start',
    requestId: message.requestId,
    sessionId: message.sessionId,
    channelKey: message.channelKey
  })

  try {
    const result = await streamChat({
      vendor: message.vendor,
      modelId: message.modelId,
      apiKey: message.apiKey,
      baseUrl: message.baseUrl,
      messages: message.messages,
      signal: abortController.signal,
      onTextDelta: (delta) => {
        sendMessage({
          type: 'chat:text-delta',
          requestId: message.requestId,
          sessionId: message.sessionId,
          channelKey: message.channelKey,
          delta
        })
      }
    })

    sendMessage({
      type: 'chat:finish',
      requestId: message.requestId,
      sessionId: message.sessionId,
      channelKey: message.channelKey,
      finishReason: 'stop',
      usage: result.usage
    })
  } catch (error) {
    const err = error as { name?: string; message?: string }
    if (err?.name === 'AbortError') {
      sendMessage({
        type: 'chat:finish',
        requestId: message.requestId,
        sessionId: message.sessionId,
        channelKey: message.channelKey,
        finishReason: 'aborted'
      })
    } else {
      sendMessage({
        type: 'chat:error',
        requestId: message.requestId,
        sessionId: message.sessionId,
        channelKey: message.channelKey,
        message: err?.message ?? 'Unknown utility error'
      })
      sendMessage({
        type: 'chat:finish',
        requestId: message.requestId,
        sessionId: message.sessionId,
        channelKey: message.channelKey,
        finishReason: 'error'
      })
    }
  } finally {
    abortControllers.delete(message.requestId)
  }
}

parentPort.on('message', async (event: { data: MainToGenerationUtilityMessage }) => {
  const message = event.data

  try {
    if (message.type === 'process:init') {
      return
    }
    if (message.type === 'chat:abort') {
      abortControllers.get(message.requestId)?.abort()
      return
    }
    if (message.type === 'chat:invoke') {
      await handleInvoke(message)
      return
    }

    sendMessage({
      type: 'process:error',
      message: 'Unknown message type',
      details: String((message as { type?: string }).type)
    })
  } catch (error) {
    const err = error as { message?: string }
    sendMessage({
      type: 'process:error',
      message: err?.message ?? 'Unhandled utility error'
    })
  }
})

sendMessage({ type: 'process:ready' })
log.info('Process ready')
setInterval(() => {}, 1000 * 60)
