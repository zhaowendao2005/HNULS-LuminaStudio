/**
 * Normal Chat 运行时类型定义
 *
 * 定义 Normal Chat 子系统的运行时事件类型，包括：
 * - Schema 调试快照（ActionSchemaDebugSnapshot）
 * - 对话流事件（StreamEvent）的各个子类型
 *
 * 流事件通过 IPC 从主进程推送到渲染进程，用于前端实时展示 Agent 执行状态。
 * 所有事件都继承自 NormalChatConversationBaseEvent（包含 requestId 和 topicId）。
 */
import type { NormalChatConversationMessage } from './conversation.types'

/** 动作 Schema 调试快照（与主进程的 action-runtime.types.ts 中的定义对应） */
export interface NormalChatActionSchemaDebugSnapshot {
  actionKey: string
  runtimeSchemaJson: Record<string, unknown>
  publicSchemaJson: Record<string, unknown>
  redactionSummary: {
    removedFields: string[]
    changedFields: Array<{
      fieldPath: string
      reason: string
      before?: unknown
      after?: unknown
    }>
  }
}

/** 对话流事件的基础接口（所有事件都包含 requestId 和 topicId） */
interface NormalChatConversationBaseEvent {
  requestId: string
  topicId: string
}

/** 助手进度事件：通知前端助手正在生成回复 */
export interface NormalChatConversationAssistantProgressEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-progress'
  /** 当前已生成的回复文本 */
  message: string
}

/** 助手文本增量事件：流式输出的原始文本片段 */
export interface NormalChatConversationAssistantTextDeltaEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-text-delta'
  /** 对应的 model call ID */
  modelCallId: string
  /** 文本增量片段 */
  delta: string
  /** 所在轮次索引 */
  roundIndex: number
  /** Agent 嵌套深度 */
  depth: number
}

/** 助手正文增量事件：流式输出中对用户可见的 Markdown 正文片段 */
export interface NormalChatConversationAssistantBodyDeltaEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-body-delta'
  /** 对应的 model call ID */
  modelCallId: string
  /** 正文增量片段 */
  delta: string
  /** 所在轮次索引 */
  roundIndex: number
  /** Agent 嵌套深度 */
  depth: number
  /** 当前正文所属的轮次语义 */
  turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
}

/** 助手最终文本块事件：一轮回复的最终文本 */
export interface NormalChatConversationAssistantFinalChunkEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-final-chunk'
  /** 对应的 model call ID */
  modelCallId: string
  /** 最终文本内容 */
  delta: string
  /** 当前正文所属的轮次语义 */
  turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
  /** 所在轮次索引 */
  roundIndex: number
  /** Agent 嵌套深度 */
  depth: number
}

/** 助手消息片段更新事件：函数调用或思考过程的实时更新 */
export interface NormalChatConversationAssistantPartUpsertEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-part-upsert'
  /** 更新的消息片段（文本/函数调用/思考过程） */
  part: NormalChatConversationMessage['parts'][number]
}

/** 子 Agent 已派发事件：在 child agent 创建后立即推送，用于主聊天流抢先展示 Agent block */
export interface NormalChatConversationSubAgentDispatchedEvent extends NormalChatConversationBaseEvent {
  type: 'subagent-dispatched'
  actionRunId: string
  childAgentRunId: string
  goal: string
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
}

/** Prompt 构建完成事件 */
export interface NormalChatConversationPromptBuiltEvent extends NormalChatConversationBaseEvent {
  type: 'prompt-built'
  /** 对应的 model call ID */
  modelCallId: string
  /** 轮次索引 */
  roundIndex: number
  /** 编译后的 Prompt 字符数 */
  promptCharCount: number
}

/** Prompt 预算截断事件：当 Prompt 超出预算时通知前端哪些段被截断 */
export interface NormalChatConversationPromptBudgetTrimmedEvent extends NormalChatConversationBaseEvent {
  type: 'prompt-budget-trimmed'
  roundIndex: number
  originalCharCount: number
  trimmedCharCount: number
  trimmedSections: Array<{
    sectionKey: string
    reason: string
    beforeCharCount: number
    afterCharCount: number
  }>
}

/** 动作验证/执行结果事件 */
export interface NormalChatConversationActionValidatedEvent extends NormalChatConversationBaseEvent {
  type: 'action-validated'
  actionKey: string
  roundIndex: number
  /** 执行状态 */
  status:
    | 'success'
    | 'schema_error'
    | 'validation_error'
    | 'permission_denied'
    | 'execution_error'
    | 'unknown_action'
  /** Schema 调试快照（开发调试用） */
  schemaDebugSnapshot: NormalChatActionSchemaDebugSnapshot | null
  /** 错误消息（成功时为 null） */
  message: string | null
}

/** 记忆更新事件：当轮次工件更新时通知前端 */
export interface NormalChatConversationMemoryUpdatedEvent extends NormalChatConversationBaseEvent {
  type: 'memory-updated'
  roundIndex: number
  /** 工件摘要文本 */
  artifactSummary: string
}

/** 消息提交事件：当助手消息持久化到数据库后通知前端 */
export interface NormalChatConversationMessageCommittedEvent extends NormalChatConversationBaseEvent {
  type: 'message-committed'
  /** 已提交的助手消息 */
  message: NormalChatConversationMessage
}

/** 任务完成事件 */
export interface NormalChatConversationFinishEvent extends NormalChatConversationBaseEvent {
  type: 'finish'
  /** 助手消息 ID */
  assistantMessageId: string | null
}

/** 错误事件 */
export interface NormalChatConversationErrorEvent extends NormalChatConversationBaseEvent {
  type: 'error'
  /** 错误消息 */
  message: string
  /** 原始错误 JSON（可选） */
  rawErrorJson?: string | null
}

/**
 * 对话流事件联合类型
 *
 * 所有可能的流事件类型的联合，前端通过 type 字段区分事件类型。
 */
export type NormalChatConversationStreamEvent =
  | NormalChatConversationAssistantProgressEvent
  | NormalChatConversationAssistantTextDeltaEvent
  | NormalChatConversationAssistantBodyDeltaEvent
  | NormalChatConversationAssistantFinalChunkEvent
  | NormalChatConversationAssistantPartUpsertEvent
  | NormalChatConversationSubAgentDispatchedEvent
  | NormalChatConversationPromptBuiltEvent
  | NormalChatConversationPromptBudgetTrimmedEvent
  | NormalChatConversationActionValidatedEvent
  | NormalChatConversationMemoryUpdatedEvent
  | NormalChatConversationMessageCommittedEvent
  | NormalChatConversationFinishEvent
  | NormalChatConversationErrorEvent
