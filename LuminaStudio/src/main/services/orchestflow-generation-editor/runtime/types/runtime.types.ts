import type { GenerationChannelKey, GenerationStageKey, GenerationStreamEvent } from '@preload/types'

export interface ActiveGenerationRun {
  runId: string
  requestId: string
  messageId: string
  sessionId: string
  channelKey: GenerationChannelKey
  stageKey: GenerationStageKey
  aborted: boolean
}

export interface GenerationEventSink {
  emit(event: GenerationStreamEvent): void
}
