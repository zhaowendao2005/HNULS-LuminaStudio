import type {
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatModelCallTurnKind,
  NormalChatRequestMetrics,
  NormalChatSubAgentMessagePart,
  NormalChatThinkingMessagePart
} from '@preload/types'

/** 渲染块：正文 Markdown */
export interface NormalChatRenderMarkdownBlock {
  kind: 'markdown'
  key: string
  text: string
  modelCallId: string | null
  turnKind?: NormalChatModelCallTurnKind
  roundIndex?: number
  depth?: number
}

/** 渲染块：思考过程 */
export interface NormalChatRenderThinkingBlock {
  kind: 'thinking'
  key: string
  part: NormalChatThinkingMessagePart
}

/** 渲染块：函数调用批次 */
export interface NormalChatRenderFunctionBatchBlock {
  kind: 'function-batch'
  key: string
  batchIndex: number
  calls: NormalChatFunctionCallMessagePart[]
}

/** 渲染块：流式占位状态 */
export interface NormalChatRenderPlaceholderBlock {
  kind: 'placeholder'
  key: string
  label: string
}

/** 渲染块：子代理 */
export interface NormalChatRenderSubAgentBlock {
  kind: 'subagent'
  key: string
  part: NormalChatSubAgentMessagePart
}

/**
 * 主聊天区的唯一规范渲染模型。
 * 组件只能消费 RenderBlock，不能再直接按原始 parts 现场拼装。
 */
export type NormalChatRenderBlock =
  | NormalChatRenderMarkdownBlock
  | NormalChatRenderThinkingBlock
  | NormalChatRenderFunctionBatchBlock
  | NormalChatRenderPlaceholderBlock
  | NormalChatRenderSubAgentBlock

/**
 * 主聊天区展示消息。
 * 它不是原始消息实体，而是由 raw message + stream overlay 组装后的渲染视图模型。
 */
export interface NormalChatConversationDisplayMessage {
  id: string
  topicId: string
  requestId: string
  role: NormalChatConversationMessage['role']
  createdAt: string
  updatedAt: string
  author: string
  time: string
  text: string
  blocks: NormalChatRenderBlock[]
  isPending?: boolean
  requestMetrics?: NormalChatRequestMetrics | null
}

/** 流式文本片段定位输入，用于把 delta 合并到稳定 block 上。 */
export interface NormalChatPendingTextAppendInput {
  modelCallId: string | null
  turnKind: NormalChatModelCallTurnKind
  roundIndex: number
  depth: number
  delta: string
}

/**
 * request 级流式覆盖层。
 * 它不是一条临时消息，而是对正式消息的流式补丁层。
 */
export interface NormalChatStreamOverlayState {
  requestId: string
  topicId: string
  createdAt: string
  updatedAt: string
  parts: NormalChatConversationMessage['parts']
  placeholderLabel: string
  isFinished: boolean
}
