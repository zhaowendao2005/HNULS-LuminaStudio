import type {
  NormalChatConversationMessageRole,
  NormalChatFunctionCallMessagePartStatus,
  NormalChatMessagePartKind
} from './common.types'

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

export type NormalChatTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'

export type NormalChatTaskPhase =
  | 'queued'
  | 'preparing_context'
  | 'building_prompt'
  | 'awaiting_model'
  | 'executing_actions'
  | 'committing_message'
  | 'finished'

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

export interface NormalChatTaskExecutionActionSnapshot {
  actionKey: string
  kind: string
  mode: string
}

export interface NormalChatTaskExecutionSnapshot {
  assistant: {
    id: string
    name: string
    emoji: string
  }
  topic: {
    id: string
    title: string
  }
  conversation: {
    id: string
    title: string
    agentTemplateId: string
  }
  request: {
    input: string
    providerId: string
    modelId: string
  }
  runtime: {
    systemPrompt: string
    streamingEnabled: boolean
    contextMemoryRounds: number
    maxRecursionDepth: number
    maxReasoningSteps: number
  }
  historyMessages: NormalChatConversationMessage[]
  promptInjections: string[]
  actions: NormalChatTaskExecutionActionSnapshot[]
  createdAt: string
}

export interface NormalChatTaskFinalResponse {
  chunks: string[]
  finalText: string
  aborted: boolean
  errorMessage: string | null
  completedAt: string | null
  assistantMessageId: string | null
}

export type NormalChatModelCallStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'

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
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'
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

export interface NormalChatAgentRunSnapshot {
  id: string
  taskId: string
  parentAgentRunId: string | null
  depth: number
  roleKind: string
  templateId: string
  goal: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'
  reactCount: number
  maxReactSteps: number
  maxChildDepth: number
  modelProviderId: string | null
  modelId: string | null
  finalText: string | null
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string
}

export interface NormalChatRuntimeEventSnapshot {
  seq: number
  taskId: string
  requestId: string
  topicId: string
  eventType: string
  payloadJson: string
  createdAt: string
}

export interface NormalChatTaskDetail {
  taskId: string
  requestId: string
  conversationId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  status: NormalChatTaskStatus
  phase: NormalChatTaskPhase
  modelProviderId: string
  modelId: string
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  executionSnapshot: NormalChatTaskExecutionSnapshot
  finalResponse: NormalChatTaskFinalResponse | null
  messages: NormalChatConversationMessage[]
  agentRuns: NormalChatAgentRunSnapshot[]
  modelCalls: NormalChatModelCallSnapshot[]
  actionRuns: NormalChatActionRunSnapshot[]
  runtimeEvents: NormalChatRuntimeEventSnapshot[]
}
