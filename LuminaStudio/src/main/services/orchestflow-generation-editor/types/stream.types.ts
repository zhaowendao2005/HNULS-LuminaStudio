import type { GenerationChannelKey } from '@preload/types'
import type { WebContents } from 'electron'

export interface ActiveGenerationStream {
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  sender: WebContents
  answerText: string
  providerId: string
  modelId: string
  abortController: AbortController
  pendingDeltaText?: string
  pendingDeltaFlushTimer?: NodeJS.Timeout | null
}
