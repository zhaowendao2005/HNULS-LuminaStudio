import type { ApiResponse } from './base.types'

/**
 * AI Chat 跨进程类型定义（Preload 权威来源）
 */

// ==================== 请求/响应类型 ====================

/**
 * 启动流式生成请求
 */
export interface AiChatStartRequest {
  conversationId: string
  providerId: string
  modelId: string
  input: string
  enableThinking?: boolean
}

/**
 * 启动流式生成响应
 */
export interface AiChatStartResponse {
  requestId: string
  conversationId: string
}

/**
 * 中断生成请求
 */
export interface AiChatAbortRequest {
  requestId: string
}

/**
 * 获取对话历史请求
 */
export interface AiChatHistoryRequest {
  conversationId: string
  limit?: number
  offset?: number
}

/**
 * 消息数据结构
 */
export interface AiChatMessage {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  text?: string
  reasoning?: string
  contentJson?: string
  status: 'final' | 'streaming' | 'aborted' | 'error'
  error?: string
  createdAt: string
}

/**
 * 对话历史响应
 */
export interface AiChatHistoryResponse {
  messages: AiChatMessage[]
  total: number
}

// ==================== 流式事件类型 ====================

/**
 * 流式事件基础接口
 */
interface BaseStreamEvent {
  requestId: string
}

/**
 * 流开始事件
 */
export interface StreamStartEvent extends BaseStreamEvent {
  type: 'stream-start'
  conversationId: string
  providerId: string
  modelId: string
  startedAt: string
}

/**
 * 文本 delta 事件
 */
export interface TextDeltaEvent extends BaseStreamEvent {
  type: 'text-delta'
  delta: string
}

/**
 * Reasoning 开始事件
 */
export interface ReasoningStartEvent extends BaseStreamEvent {
  type: 'reasoning-start'
  id: string
}

/**
 * Reasoning delta 事件
 */
export interface ReasoningDeltaEvent extends BaseStreamEvent {
  type: 'reasoning-delta'
  id: string
  delta: string
}

/**
 * Reasoning 结束事件
 */
export interface ReasoningEndEvent extends BaseStreamEvent {
  type: 'reasoning-end'
  id: string
}

/**
 * 工具调用事件
 */
export interface ToolCallEvent extends BaseStreamEvent {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  input: unknown
}

/**
 * 工具调用 delta 事件（streaming tool args）
 */
export interface ToolCallDeltaEvent extends BaseStreamEvent {
  type: 'tool-call-delta'
  toolCallId: string
  toolName: string
  argsTextDelta: string
}

/**
 * 工具结果事件
 */
export interface ToolResultEvent extends BaseStreamEvent {
  type: 'tool-result'
  toolCallId: string
  toolName: string
  result: unknown
}

/**
 * 错误事件
 */
export interface ErrorEvent extends BaseStreamEvent {
  type: 'error'
  message: string
  stack?: string
  code?: string
}

/**
 * 完成事件
 */
export interface FinishEvent extends BaseStreamEvent {
  type: 'finish'
  finishReason: 'stop' | 'aborted' | 'error'
  messageId?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    reasoningTokens?: number
    totalTokens: number
  }
}

/**
 * 流式事件联合类型
 */
export type AiChatStreamEvent =
  | StreamStartEvent
  | TextDeltaEvent
  | ReasoningStartEvent
  | ReasoningDeltaEvent
  | ReasoningEndEvent
  | ToolCallEvent
  | ToolCallDeltaEvent
  | ToolResultEvent
  | ErrorEvent
  | FinishEvent

// ==================== API 接口定义 ====================

/**
 * AI Chat API 契约
 */
export interface AiChatAPI {
  /**
   * 启动流式生成
   */
  start: (request: AiChatStartRequest) => Promise<ApiResponse<AiChatStartResponse>>

  /**
   * 中断生成
   */
  abort: (request: AiChatAbortRequest) => Promise<ApiResponse<void>>

  /**
   * 获取对话历史
   */
  history: (request: AiChatHistoryRequest) => Promise<ApiResponse<AiChatHistoryResponse>>

  /**
   * 订阅流式事件
   * 返回 unsubscribe 函数
   */
  onStream: (handler: (event: AiChatStreamEvent) => void) => () => void
}
