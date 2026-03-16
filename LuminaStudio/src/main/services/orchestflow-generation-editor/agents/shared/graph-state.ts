import type { GenerationChannelKey } from '@preload/types'

export interface GenerationGraphState {
  sessionId: string
  channelKey: GenerationChannelKey
  userText: string
  memoryWindow: string[]
}
