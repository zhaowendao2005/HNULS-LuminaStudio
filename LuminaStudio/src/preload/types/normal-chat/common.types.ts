/**
 * Normal Chat 通用类型定义
 *
 * 定义 Normal Chat 子系统中使用的通用枚举类型和联合类型。
 * 这些类型被 conversation.types.ts、runtime.types.ts 等文件引用。
 */
export type NormalChatTopicPromptMode = 'inherit' | 'override'

export type NormalChatCallMode = 'fast' | 'slow' | 'auto'

export type NormalChatCostMode = 'per_call' | 'per_token'

/** 消息片段类型：文本 / 函数调用 / 思考过程 / 子代理 */
export type NormalChatMessagePartKind = 'text' | 'functioncall' | 'thinking' | 'subagent'

/** 函数调用消息片段的状态 */
export type NormalChatFunctionCallMessagePartStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'aborted'

/** 子代理消息片段的状态 */
export type NormalChatSubAgentMessagePartStatus = 'queued' | 'running' | 'completed' | 'failed'

/** 对话消息角色 */
export type NormalChatConversationMessageRole = 'user' | 'assistant'
