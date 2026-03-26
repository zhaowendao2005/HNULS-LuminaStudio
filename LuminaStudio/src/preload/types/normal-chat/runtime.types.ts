import type { NormalChatConversationStatusPhase } from './common.types'
import type {
  NormalChatConversationMessage,
  NormalChatConversationRuntimeTrace
} from './conversation.types'

interface NormalChatConversationBaseEvent {
  requestId: string
  topicId: string
}

export interface NormalChatConversationStatusEvent extends NormalChatConversationBaseEvent {
  type: 'status'
  phase: NormalChatConversationStatusPhase
  message: string
}

export interface NormalChatConversationAssistantProgressEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-progress'
  message: string
}

export interface NormalChatConversationAssistantFinalChunkEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-final-chunk'
  delta: string
}

export interface NormalChatConversationAssistantPartUpsertEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-part-upsert'
  part: NormalChatConversationMessage['parts'][number]
}

export interface NormalChatConversationMessageCommittedEvent extends NormalChatConversationBaseEvent {
  type: 'message-committed'
  message: NormalChatConversationMessage
}

/**
 * TODO(normal-chat-rewrite): 这里是给前端保留的兼容事件，后续新系统会替换 payload 结构。
 */
export interface NormalChatConversationRuntimeTraceUpsertEvent extends NormalChatConversationBaseEvent {
  type: 'runtime-trace-upsert'
  runtimeTrace: NormalChatConversationRuntimeTrace
  summary?: Record<string, unknown> | null
}

export interface NormalChatConversationTurnDetailUpsertEvent extends NormalChatConversationBaseEvent {
  type: 'turn-detail-upsert'
}

export interface NormalChatConversationFinishEvent extends NormalChatConversationBaseEvent {
  type: 'finish'
  assistantMessageId: string | null
}

export interface NormalChatConversationErrorEvent extends NormalChatConversationBaseEvent {
  type: 'error'
  message: string
  rawErrorJson?: string | null
}

export type NormalChatConversationStreamEvent =
  | NormalChatConversationStatusEvent
  | NormalChatConversationAssistantProgressEvent
  | NormalChatConversationAssistantFinalChunkEvent
  | NormalChatConversationAssistantPartUpsertEvent
  | NormalChatConversationMessageCommittedEvent
  | NormalChatConversationRuntimeTraceUpsertEvent
  | NormalChatConversationTurnDetailUpsertEvent
  | NormalChatConversationFinishEvent
  | NormalChatConversationErrorEvent
