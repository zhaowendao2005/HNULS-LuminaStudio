import type {
  NormalChatConversationMessageRole,
  NormalChatFunctionCallMessagePartStatus,
  NormalChatMessagePartKind,
  NormalChatTopicPromptMode
} from './common.types'
import type { NormalChatAgentExecutionTrace, NormalChatAgentTree } from './runtime.types'
import type { NormalChatAssistant } from './workspace.types'

export interface NormalChatTextMessagePart {
  kind: Extract<NormalChatMessagePartKind, 'text'>
  text: string
}

export interface NormalChatFunctionCallMessagePart {
  kind: Extract<NormalChatMessagePartKind, 'functioncall'>
  callId: string
  functionCallName: string
  title: string
  status: NormalChatFunctionCallMessagePartStatus
  input: string
  output: string
  errorMessage: string | null
  isStreaming: boolean
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
  decisionReason: string | null
}

export type NormalChatMessagePart = NormalChatTextMessagePart | NormalChatFunctionCallMessagePart

export interface NormalChatConversationMessage {
  id: string
  topicId: string
  requestId: string
  role: NormalChatConversationMessageRole
  parts: NormalChatMessagePart[]
  createdAt: string
  updatedAt: string
}

export interface NormalChatConversationSnapshot {
  topicId: string
  messages: NormalChatConversationMessage[]
}

export interface NormalChatConversationPromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface NormalChatConversationTurnRequestPayload {
  assistant: Pick<
    NormalChatAssistant,
    | 'id'
    | 'name'
    | 'emoji'
    | 'templateKey'
    | 'defaultSystemPrompt'
    | 'saveFullConversationEnabled'
    | 'callMode'
    | 'costMode'
    | 'maxRecursionDepth'
    | 'maxRetriesPerAgent'
  >
  topic: {
    id: string
    title: string
    systemPromptMode: NormalChatTopicPromptMode
    systemPromptOverride: string | null
  }
  providerId: string
  modelId: string
  input: string
  effectiveSystemPrompt: string
  promptMessages: NormalChatConversationPromptMessage[]
}

export interface NormalChatConversationTurnResponsePayload {
  chunks: string[]
  finalText: string
  aborted: boolean
  errorMessage: string | null
  completedAt: string | null
  agentTree: NormalChatAgentTree | null
  execution?: NormalChatAgentExecutionTrace | null
}

export interface NormalChatConversationTurnDetail {
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  saveFullConversationEnabled: boolean
  hasTrace: boolean
  requestPayload: NormalChatConversationTurnRequestPayload | null
  responsePayload: NormalChatConversationTurnResponsePayload | null
  messages: NormalChatConversationMessage[]
}
