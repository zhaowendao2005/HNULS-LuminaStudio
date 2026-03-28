import type {
  NormalChatConversationMessageRole,
  NormalChatFunctionCallMessagePartStatus,
  NormalChatMessagePartKind,
  NormalChatTopicPromptMode
} from './common.types'
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

export interface NormalChatRequestMetrics {
  providerId: string
  providerName: string | null
  modelId: string
  modelName: string | null
  firstTokenLatencyMs: number | null
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  modelCallCount: number
  streamingEnabled: boolean
}

/**
 * 这里只保留兼容壳字段：agentTree/execution 目前不再由旧 agent 系统维护。
 * TODO(normal-chat-rewrite): 新系统落地后再把这里替换成新运行时的稳定结构。
 */
export interface NormalChatConversationRuntimeTrace {
  traceVersion: number
  agentTree: Record<string, unknown> | null
  metrics: NormalChatRequestMetrics | null
  execution?: Record<string, unknown> | null
}

/**
 * requestRecord / responseRecord / runtimeTrace 是 turn trace 协议的 3 个稳定剖面：
 * - requestRecord: 这轮请求如何被组织
 * - responseRecord: 这轮请求最终给用户的可见结果
 * - runtimeTrace: 这轮请求在运行时的追踪信息（当前为兼容壳）
 */
export interface NormalChatConversationTurnRequestRecord {
  assistant: Pick<
    NormalChatAssistant,
    | 'id'
    | 'name'
    | 'emoji'
    | 'defaultSystemPrompt'
    | 'streamingEnabled'
    | 'callMode'
    | 'costMode'
    | 'defaultModelProviderId'
    | 'defaultModelId'
    | 'contextMemoryRounds'
    | 'maxRecursionDepth'
    | 'maxReasoningSteps'
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

export type NormalChatModelCallStatus = 'queued' | 'running' | 'completed' | 'failed' | 'aborted'

export interface NormalChatPromptSnapshot {
  context: string
  actionDescriptions: string
  loadedActionSpecs: string
  actionResults: string
  outputContract: string
}

export interface NormalChatModelCallSnapshot {
  id: string
  seq: number
  taskId: string
  requestId: string
  conversationId: string
  agentRunId: string
  parentActionRunId: string | null
  depth: number
  roundIndex: number
  callIndexInAgent: number
  status: NormalChatModelCallStatus
  requestPayloadJson: string
  compiledPromptJson: NormalChatPromptSnapshot
  compiledPromptMarkdown: string
  historyMessagesJson: string
  loadedActionsJson: string
  actionResultsJson: string
  responseStreamText: string | null
  responseEnvelopeJson: string | null
  finalReplyMd: string | null
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string
}

export interface NormalChatActionRunSnapshot {
  id: string
  taskId: string
  agentRunId: string
  actionKey: string
  actionKind: string
  mode: string | null
  status: 'queued' | 'running' | 'success' | 'error' | 'aborted'
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  inputJson: string
  outputJson: string | null
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string
}

export interface NormalChatConversationTurnDetail {
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  hasTrace: boolean
  requestRecord: NormalChatConversationTurnRequestRecord | null
  responseRecord: NormalChatConversationTurnResponseRecord | null
  runtimeTrace: NormalChatConversationRuntimeTrace | null
  messages: NormalChatConversationMessage[]
  modelCalls: NormalChatModelCallSnapshot[]
  actionRuns: NormalChatActionRunSnapshot[]
}
