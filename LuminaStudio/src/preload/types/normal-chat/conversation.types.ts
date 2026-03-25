import type {
  NormalChatConversationMessageRole,
  NormalChatFunctionCallMessagePartStatus,
  NormalChatMessagePartKind,
  NormalChatTopicPromptMode
} from './common.types'
import type {
  NormalChatAgentExecutionTrace,
  NormalChatAgentTree,
  NormalChatRequestMetrics
} from './runtime-trace.types'
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

/**
 * requestRecord / responseRecord / runtimeTrace 是新 turn trace 协议的 3 个稳定剖面：
 * - requestRecord: 这轮请求“如何被组织”
 * - responseRecord: 这轮请求“最终产生了什么用户可见结果”
 * - runtimeTrace: 这轮请求“系统内部如何跑”
 */
export interface NormalChatConversationTurnRequestRecord {
  assistant: Pick<
    NormalChatAssistant,
    | 'id'
    | 'name'
    | 'emoji'
    | 'templateKey'
    | 'defaultSystemPrompt'
    | 'saveFullConversationEnabled'
    | 'streamingEnabled'
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
  streamingEnabled: boolean
  input: string
  effectiveSystemPrompt: string
  promptMessages: NormalChatConversationPromptMessage[]
}

export interface NormalChatConversationTurnResponseRecord {
  chunks: string[]
  finalText: string
  aborted: boolean
  errorMessage: string | null
  completedAt: string | null
}

export interface NormalChatConversationRuntimeTrace {
  traceVersion: number
  agentTree: NormalChatAgentTree | null
  metrics: NormalChatRequestMetrics | null
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
  requestRecord: NormalChatConversationTurnRequestRecord | null
  responseRecord: NormalChatConversationTurnResponseRecord | null
  runtimeTrace: NormalChatConversationRuntimeTrace | null
  messages: NormalChatConversationMessage[]
}
