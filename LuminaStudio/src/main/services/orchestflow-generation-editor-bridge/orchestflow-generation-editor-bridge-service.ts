import { utilityProcess } from 'electron'
import type { UtilityProcess } from 'electron'
import path from 'path'
import { logger } from '../logger'
import type {
  GenerationUtilityToMainMessage,
  MainToGenerationUtilityMessage,
  GenerationUtilityChatMessage
} from '@utility/orchestflow-generation-editor/messages.types'
import type { GenerationChannelKey, GenerationSdkVendor } from '@preload/types'

const log = logger.scope('OrchestflowGenerationEditorBridge')

export class OrchestflowGenerationEditorBridgeService {
  private process: UtilityProcess | null = null
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null
  private messageHandlers: Array<(message: GenerationUtilityToMainMessage) => void> = []

  onMessage(handler: (message: GenerationUtilityToMainMessage) => void): () => void {
    this.messageHandlers.push(handler)
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index >= 0) this.messageHandlers.splice(index, 1)
    }
  }

  async spawn(): Promise<void> {
    if (this.process) return

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })

    const modulePath = path.join(__dirname, 'utility/orchestflow-generation-editor.js')
    this.process = utilityProcess.fork(modulePath)

    this.process.on('message', (message: GenerationUtilityToMainMessage) => {
      this.handleMessage(message)
    })
    this.process.on('exit', (code) => {
      log.info('Process exited', { code })
      this.process = null
    })

    await this.readyPromise
  }

  init(): void {
    this.send({ type: 'process:init' })
  }

  invokeChat(params: {
    requestId: string
    sessionId: string
    channelKey: GenerationChannelKey
    vendor: GenerationSdkVendor
    modelId: string
    apiKey: string
    baseUrl?: string
    messages: GenerationUtilityChatMessage[]
  }): void {
    this.send({
      type: 'chat:invoke',
      requestId: params.requestId,
      sessionId: params.sessionId,
      channelKey: params.channelKey,
      vendor: params.vendor,
      modelId: params.modelId,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      messages: params.messages
    })
  }

  abortChat(requestId: string): void {
    this.send({ type: 'chat:abort', requestId })
  }

  kill(): void {
    this.process?.kill()
    this.process = null
    this.messageHandlers = []
  }

  private send(message: MainToGenerationUtilityMessage): void {
    if (!this.process) {
      throw new Error('orchestflow-generation-editor process not spawned')
    }
    this.process.postMessage(message)
  }

  private handleMessage(message: GenerationUtilityToMainMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message)
    }

    if (message.type === 'process:ready') {
      this.readyResolve?.()
    }
  }
}

export const orchestflowGenerationEditorBridge = new OrchestflowGenerationEditorBridgeService()
