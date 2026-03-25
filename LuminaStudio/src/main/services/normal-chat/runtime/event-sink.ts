import type {
  NormalChatConversationStreamEvent,
  NormalChatFunctionCallMessagePart
} from '@preload/types'

export class NormalChatRuntimeEventSink {
  constructor(private readonly emit: (event: NormalChatConversationStreamEvent) => void) {}

  emitEvent(event: NormalChatConversationStreamEvent): void {
    this.emit(event)
  }

  emitRootHelperPart(
    requestId: string,
    topicId: string,
    part: NormalChatFunctionCallMessagePart
  ): void {
    this.emit({
      type: 'assistant-part-upsert',
      requestId,
      topicId,
      part
    })
  }

  emitProgress(requestId: string, topicId: string, message: string): void {
    this.emit({
      type: 'assistant-progress',
      requestId,
      topicId,
      message
    })
  }

  emitFinalChunk(requestId: string, topicId: string, delta: string): void {
    this.emit({
      type: 'assistant-final-chunk',
      requestId,
      topicId,
      delta
    })
  }
}
