import { randomUUID } from 'crypto'
import type { GenerationChannelKey, GenerationStageKey } from '@preload/types'
import type { ActiveGenerationRun } from './types/runtime.types'

export function createActiveGenerationRun(params: {
  sessionId: string
  channelKey: GenerationChannelKey
  stageKey: GenerationStageKey
  messageId: string
}): ActiveGenerationRun {
  return {
    runId: randomUUID(),
    requestId: randomUUID(),
    messageId: params.messageId,
    sessionId: params.sessionId,
    channelKey: params.channelKey,
    stageKey: params.stageKey,
    aborted: false
  }
}
