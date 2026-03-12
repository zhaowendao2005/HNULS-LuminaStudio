import type { GenerationSdkVendor } from '@preload/types'

export interface GenerationStreamChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChatParams {
  vendor: GenerationSdkVendor
  modelId: string
  apiKey: string
  baseUrl?: string
  defaultHeaders?: Record<string, string>
  messages: GenerationStreamChatMessage[]
  onTextDelta: (delta: string) => void
  onRawEvent?: (event: unknown) => void
  signal: AbortSignal
}

export interface StreamChatResult {
  usage?: Record<string, unknown>
  rawTrace: unknown[]
}
