import type { NormalChatConversationStreamEvent } from '@preload/types'
import { logger } from '@main/services/logger'
import { NormalChatRuntimeEventsRepository } from '../../repositories/runtime-events.repository'
import { nowIso } from '../../shared/utils'

const log = logger.scope('NormalChatStreamPublisher')

// 负责将 runtime 事件写入数据库并广播给 renderer，保持 streamEmitter 与落库同步。
export class NormalChatStreamPublisher {
  private streamEmitter: ((event: NormalChatConversationStreamEvent) => void) | null = null

  constructor(private readonly runtimeEventsRepository: NormalChatRuntimeEventsRepository) {}

  setEmitter(emitter: (event: NormalChatConversationStreamEvent) => void): void {
    this.streamEmitter = emitter
  }

  // 每次事件先落库再广播，确保 trace 和 UI 视图一致。
  publish(
    taskId: string,
    topicId: string,
    requestId: string,
    event: NormalChatConversationStreamEvent
  ): void {
    try {
      this.runtimeEventsRepository.insert(taskId, requestId, topicId, event, nowIso())
    } catch (error) {
      log.error('Failed to persist runtime event', error, {
        taskId,
        requestId,
        eventType: event.type
      })
    }

    this.streamEmitter?.(event)
  }
}
