import type { NormalChatConversationStreamEvent } from '@preload/types'
import { logger } from '@main/services/logger'
import { NormalChatRuntimeEventsRepository } from '../../repositories/runtime-events.repository'
import { nowIso } from '../../shared/utils'

const log = logger.scope('NormalChatStreamPublisher')

export class NormalChatStreamPublisher {
  private streamEmitter: ((event: NormalChatConversationStreamEvent) => void) | null = null
  private readonly runtimeEventPersistenceByRequestId = new Map<string, boolean>()

  constructor(private readonly runtimeEventsRepository: NormalChatRuntimeEventsRepository) {}

  setEmitter(emitter: (event: NormalChatConversationStreamEvent) => void): void {
    this.streamEmitter = emitter
  }

  setRuntimeEventPersistence(requestId: string, enabled: boolean): void {
    this.runtimeEventPersistenceByRequestId.set(requestId, enabled)
  }

  clearRuntimeEventPersistence(requestId: string): void {
    this.runtimeEventPersistenceByRequestId.delete(requestId)
  }

  publish(
    taskId: string,
    topicId: string,
    requestId: string,
    event: NormalChatConversationStreamEvent
  ): number | null {
    const shouldPersist = this.runtimeEventPersistenceByRequestId.get(requestId) ?? true
    if (!shouldPersist) {
      this.streamEmitter?.(event)
      return null
    }

    try {
      const seq = this.runtimeEventsRepository.insert(taskId, requestId, topicId, event, nowIso())
      this.streamEmitter?.(event)
      return seq
    } catch (error) {
      log.error('Failed to persist runtime event', error, {
        taskId,
        requestId,
        eventType: event.type
      })
      this.streamEmitter?.(event)
      return null
    }
  }
}
