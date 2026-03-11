import type { GenerationChannelKey, GenerationSdkVendor } from '@preload/types'

export interface GenerationUtilityChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type MainToGenerationUtilityMessage =
  | { type: 'process:init' }
  | {
      type: 'chat:invoke'
      requestId: string
      sessionId: string
      channelKey: GenerationChannelKey
      vendor: GenerationSdkVendor
      modelId: string
      apiKey: string
      baseUrl?: string
      messages: GenerationUtilityChatMessage[]
    }
  | { type: 'chat:abort'; requestId: string }

export type GenerationUtilityToMainMessage =
  | { type: 'process:ready' }
  | { type: 'process:error'; message: string; details?: string }
  | {
      type: 'chat:start'
      requestId: string
      sessionId: string
      channelKey: GenerationChannelKey
    }
  | {
      type: 'chat:text-delta'
      requestId: string
      sessionId: string
      channelKey: GenerationChannelKey
      delta: string
    }
  | {
      type: 'chat:finish'
      requestId: string
      sessionId: string
      channelKey: GenerationChannelKey
      finishReason: 'stop' | 'aborted' | 'error'
      usage?: Record<string, unknown>
    }
  | {
      type: 'chat:error'
      requestId: string
      sessionId: string
      channelKey: GenerationChannelKey
      message: string
    }
