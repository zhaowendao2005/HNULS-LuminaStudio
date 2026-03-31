import type { NormalChatConversationStatusPhase } from './common.types'
import type { NormalChatConversationMessage } from './conversation.types'

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
  | NormalChatConversationFinishEvent
  | NormalChatConversationErrorEvent
