/**
 * Normal Chat 对话与运行时类型定义
 *
 * 定义 Normal Chat 子系统的核心数据结构，包括：
 * - 消息片段类型（Text / FunctionCall / Thinking）
 * - 对话消息和快照
 * - 任务执行快照和状态
 * - Prompt 快照和截断记录
 * - 模型调用、动作运行、Agent 运行快照
 * - 任务详情
 *
 * 这些类型在 preload 层定义，通过 IPC 桥接在主进程和渲染进程之间共享。
 */
import type {
  NormalChatConversationMessageRole,
  NormalChatFunctionCallMessagePartStatus,
  NormalChatMessagePartKind,
  NormalChatSubAgentMessagePartStatus
} from './common.types'
import type { NormalChatPersistencePreset } from './workspace.types'

/** 文本消息片段 */
export interface NormalChatTextMessagePart {
  kind: Extract<NormalChatMessagePartKind, 'text'>
  /** 文本内容 */
  text: string
  /** 所属 assistant 轮次语义 */
  turnKind?: NormalChatModelCallTurnKind
  /** 所在轮次索引 */
  roundIndex?: number
  /** Agent 嵌套深度 */
  depth?: number
  /** 对应的 model call ID */
  modelCallId?: string | null
}

/** 函数调用消息片段（动作执行记录） */
export interface NormalChatFunctionCallMessagePart {
  kind: Extract<NormalChatMessagePartKind, 'functioncall'>
  /** 调用唯一标识 */
  callId: string
  /** 函数/动作名称 */
  functionCallName: string
  /** 动作显示标题 */
  title: string
  /** 执行状态 */
  status: NormalChatFunctionCallMessagePartStatus
  /** 输入参数 JSON 字符串 */
  input: string
  /** 输出结果 JSON 字符串 */
  output: string
  /** 错误消息（成功时为 null） */
  errorMessage: string | null
  /** 是否正在流式传输 */
  isStreaming: boolean
  /** 所在轮次索引 */
  roundIndex: number
  /** 批次索引 */
  batchIndex: number
  /** 并行索引 */
  parallelIndex: number
  /** Agent 嵌套深度 */
  depth: number
  /** 执行原因描述 */
  decisionReason: string | null
}

/** 思考过程消息片段（CoT 思维链） */
export interface NormalChatThinkingMessagePart {
  kind: Extract<NormalChatMessagePartKind, 'thinking'>
  /** 思考内容来源 */
  source: 'provider-native' | 'assistant-tagged'
  /** 思考标题 */
  title: string
  /** 思考内容 */
  content: string
  /** 是否正在流式传输 */
  isStreaming: boolean
  /** 所在轮次索引 */
  roundIndex: number
  /** Agent 嵌套深度 */
  depth: number
}

/** 子代理消息片段 */
export interface NormalChatSubAgentMessagePart {
  kind: Extract<NormalChatMessagePartKind, 'subagent'>
  /** 消息片段唯一标识 */
  partId: string
  /** 子代理目标描述 */
  goal: string
  /** 子代理运行 ID（创建后填充，失败时可能为 null） */
  childAgentRunId: string | null
  /** 所在轮次索引 */
  roundIndex: number
  /** 批次索引 */
  batchIndex: number
  /** 并行索引 */
  parallelIndex: number
  /** Agent 嵌套深度 */
  depth: number
  /** 执行状态 */
  status: NormalChatSubAgentMessagePartStatus
}

/** 消息片段联合类型 */
export type NormalChatMessagePart =
  | NormalChatTextMessagePart
  | NormalChatFunctionCallMessagePart
  | NormalChatThinkingMessagePart
  | NormalChatSubAgentMessagePart

/** 对话消息 */
export interface NormalChatConversationMessage {
  /** 消息唯一标识 */
  id: string
  /** 所属话题 ID */
  topicId: string
  /** 关联的请求 ID */
  requestId: string
  /** 消息角色（user / assistant） */
  role: NormalChatConversationMessageRole
  /** 消息片段列表（文本、函数调用、思考过程的混合） */
  parts: NormalChatMessagePart[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 对话快照 */
export interface NormalChatConversationSnapshot {
  topicId: string
  messages: NormalChatConversationMessage[]
}

/** 任务状态 */
export type NormalChatTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'

/** 任务执行阶段 */
export type NormalChatTaskPhase =
  | 'queued'
  | 'preparing_context'
  | 'building_prompt'
  | 'awaiting_model'
  | 'executing_actions'
  | 'finished'

/** 请求指标（Token 用量、延迟等） */
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

/** 任务执行快照中的动作配置 */
export interface NormalChatTaskExecutionActionSnapshot {
  actionKey: string
  kind: string
  mode: string
}

/** 任务执行快照（Agent 运行所需的完整上下文） */
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
    persistencePreset: NormalChatPersistencePreset
    promptBudgetChars?: number
    roundMemoryWindow?: number
    maxRepairAttempts?: number
    maxProviderRetries?: number
  }
  historyMessages: NormalChatConversationMessage[]
  promptInjections: string[]
  actions: NormalChatTaskExecutionActionSnapshot[]
  createdAt: string
}

/** 任务最终响应 */
export interface NormalChatTaskFinalResponse {
  chunks: string[]
  finalText: string
  aborted: boolean
  errorMessage: string | null
  completedAt: string | null
  assistantMessageId: string | null
}

/** 模型调用状态 */
export type NormalChatModelCallStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'

/** Prompt 系统段快照 */
export interface NormalChatPromptSystemSectionsSnapshot {
  identity: string
  outputContract: string
  actionProtocol: string
  repairContract: string
}

/** Prompt 轮次段快照 */
export interface NormalChatPromptRoundSectionsSnapshot {
  context: string
  latestActionTurnResults: string
  priorRoundMemory: string
  actionDescriptions: string
  loadedActionSpecs: string
  actionResults: string
  actionFeedback: string
  thinkingDigest?: string
  repairNotice?: string
}

/** Prompt 截断快照（记录哪些段被截断及截断量） */
export interface NormalChatPromptTrimSnapshot {
  originalCharCount: number
  trimmedCharCount: number
  trimmedSections: Array<{
    sectionKey: string
    reason: string
    beforeCharCount: number
    afterCharCount: number
  }>
}

/** Prompt 快照（编译后的完整 Prompt 信息） */
export interface NormalChatPromptSnapshot {
  systemSections: NormalChatPromptSystemSectionsSnapshot
  roundSections: NormalChatPromptRoundSectionsSnapshot
  compiledSystemPrompt: string
  compiledRoundPrompt: string
  trimSnapshot?: NormalChatPromptTrimSnapshot | null
}

/** 模型调用快照。 */
export type NormalChatModelCallTurnKind = 'answer' | 'action_plan' | 'post_action_synthesis'

export interface NormalChatCapturedProviderRequestSnapshot {
  id: string
  capturedAt: string
  requestId: string
  modelCallId: string
  protocol: string
  providerId: string
  modelId: string
  streaming: boolean
  method: string
  url: string
  headers: Record<string, string>
  bodyText: string | null
  bodyJson: unknown | null
}

export interface NormalChatModelCallSnapshot {
  id: string
  seq: number
  taskId: string
  requestId: string
  conversationId: string
  agentRunId: string
  parentActionRunId: string | null
  turnKind: NormalChatModelCallTurnKind
  producedActionCount: number
  consumedActionRunIds: string[]
  synthesisRequired: boolean
  depth: number
  roundIndex: number
  callIndexInAgent: number
  status: NormalChatModelCallStatus
  requestPayloadJson: string
  rawProviderRequest: NormalChatCapturedProviderRequestSnapshot | null
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

/** 动作运行快照。 */
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

/** Agent 运行快照。 */
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

/**
 * Request 头表快照。
 *
 * 这是 request 级别的“索引视图”，只保留当前状态与定位信息，
 * 不承担调试细节真相；细节一律从 request entry 流回放得到。
 */
export interface NormalChatRequestHeadSnapshot {
  requestId: string
  assistantId: string
  topicId: string
  conversationId: string
  rootAgentRunId: string | null
  userMessageId: string | null
  assistantMessageId: string | null
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted' | 'deleted'
  phase:
    | 'queued'
    | 'preparing_context'
    | 'building_prompt'
    | 'awaiting_model'
    | 'executing_actions'
    | 'finished'
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string
  lastEntrySeq: number | null
}

/**
 * Request entry 是新的运行时真相源。
 *
 * 约束：
 * - `entityKind` 只表示对象归属层（message / model_call / action_run / agent_run / request）
 * - `op` 只表示变更形态（created / patched / delta / status / finished / failed / deleted）
 * - 更细的语义统一放进 payload.kind，例如 `message_visible_delta`、`action_validated`
 */
export interface NormalChatRequestEntry {
  seq: number
  requestId: string
  assistantId: string
  topicId: string
  conversationId: string
  entityKind: 'request' | 'message' | 'model_call' | 'action_run' | 'agent_run'
  entityId: string
  parentEntityId: string | null
  op: 'created' | 'patched' | 'delta' | 'status' | 'finished' | 'failed' | 'deleted'
  visibility: 'transcript' | 'debug' | 'agent' | 'internal'
  payloadJson: string
  createdAt: string
}

/**
 * 主聊天 transcript 快照。
 *
 * 这是 renderer 主会话区应该消费的唯一快照来源；
 * `messages` 已经是排序后的 topic 级消息视图，`highWatermark` 用于衔接增量订阅。
 */
export interface NormalChatTopicTranscriptSnapshot {
  topicId: string
  messages: NormalChatConversationMessage[]
  requestHeads: NormalChatRequestHeadSnapshot[]
  highWatermark: number
}

/** 单个 request 的 detail 快照。 */
export interface NormalChatRequestDetailSnapshot {
  head: NormalChatRequestHeadSnapshot | null
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  modelProviderId: string | null
  modelId: string | null
  executionSnapshot: NormalChatTaskExecutionSnapshot | null
  finalResponse: NormalChatTaskFinalResponse | null
  messages: NormalChatConversationMessage[]
  modelCalls: NormalChatModelCallSnapshot[]
  actionRuns: NormalChatActionRunSnapshot[]
  agentRuns: NormalChatAgentRunSnapshot[]
}

export interface NormalChatAgentGraphPlanStepSnapshot {
  stepIndex: number
  phase: string
  action: string
  reasoning: string | null
  statusText: string | null
  budgetSummary: string | null
  stopReason: string | null
  actionsJson: string | null
  parsedJson: string | null
}

export interface NormalChatAgentGraphHelperInvocationSnapshot {
  callId: string
  displayName: string
  status: string
  argsJson: string | null
  resultSummary: string | null
  failureSummary: string | null
}

export interface NormalChatAgentGraphNodeSnapshot {
  agentId: string
  depth: number
  roleKind: string
  taskKind: string
  goal: string
  summary: string
  finalResult: string | null
  status: string
  retryCount: number
  errorMessage: string | null
  childAgentIds: string[]
  planHistory: NormalChatAgentGraphPlanStepSnapshot[]
  helperInvocations: NormalChatAgentGraphHelperInvocationSnapshot[]
}

export interface NormalChatAgentGraphTreeSnapshot {
  requestId: string
  rootAgentId: string
  fallbackTriggered: boolean
  agents: Record<string, NormalChatAgentGraphNodeSnapshot>
}

export interface NormalChatAgentGraphSummarySnapshot {
  requestId: string
  totalAgents: number
  runningAgents: number
  failedAgents: number
  completedAgents: number
  maxDepth: number
  fallbackTriggered: boolean
}

export interface NormalChatAgentGraphSnapshot {
  tree: NormalChatAgentGraphTreeSnapshot | null
  summary: NormalChatAgentGraphSummarySnapshot | null
}

export interface NormalChatRequestDebugSnapshot {
  detail: NormalChatRequestDetailSnapshot
  agentGraph: NormalChatAgentGraphSnapshot
  highWatermark: number
}
