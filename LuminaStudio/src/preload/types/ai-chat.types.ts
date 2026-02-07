import type { ApiResponse } from './base.types'
import type {
  LangchainClientNodeErrorPayload,
  LangchainClientNodeResultPayload,
  LangchainClientNodeStartPayload,
  LangchainClientToolCallPayload,
  LangchainClientToolResultPayload
} from '@shared/langchain-client.types'

/**
 * AI Chat 跨进程类型定义（Preload 权威来源）
 */

// ==================== 请求/响应类型 ====================

/**
 * 启动流式生成请求
 */
export interface AiChatRetrievalScope {
  /** Knowledge base ID */
  knowledgeBaseId: number
  /** Vector table name (e.g. emb_cfg_xxx_3072_chunks) */
  tableName: string
  /** Optional: restrict retrieval within these documents */
  fileKeys?: string[]
}

/** Node 开始事件 */
export interface NodeStartEvent extends BaseStreamEvent {
  type: 'node-start'
  payload: LangchainClientNodeStartPayload
}

/** Node 完成事件 */
export interface NodeResultEvent extends BaseStreamEvent {
  type: 'node-result'
  payload: LangchainClientNodeResultPayload
}

/** Node 错误事件 */
export interface NodeErrorEvent extends BaseStreamEvent {
  type: 'node-error'
  payload: LangchainClientNodeErrorPayload
}

export interface AiChatRetrievalConfig {
  /** One request can query multiple vector tables (different embeddings) */
  scopes: AiChatRetrievalScope[]
  /** Total topK budget across scopes (tool will split per scope) */
  k?: number
  /** HNSW ef parameter */
  ef?: number
  /** Optional: rerank model id */
  rerankModelId?: string
  /** Optional: rerank topN */
  rerankTopN?: number
}

export interface AiChatStartRequest {
  conversationId: string
  agentId: string
  providerId: string
  modelId: string
  input: string
  enableThinking?: boolean

  /** normal: Vercel AI SDK pipeline; agent: LangChain utility process */
  mode?: 'normal' | 'agent'

  /** Agent-mode-only: retrieval scope snapshot derived from SourcesTab selection */
  retrieval?: AiChatRetrievalConfig

  /** Agent-mode-only: allow renderer to override provider config (from model-config store) */
  providerOverride?: {
    baseUrl: string
    apiKey: string
    defaultHeaders?: Record<string, string>
  }
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
 * 创建助手请求
 */
export interface AiChatCreateAgentRequest {
  name: string
  description?: string | null
}

/**
 * 创建对话请求
 */
export interface AiChatCreateConversationRequest {
  agentId: string
  title?: string | null
  providerId: string
  modelId: string
  enableThinking?: boolean
}

/**
 * 获取指定 Agent 下的对话列表请求
 */
export interface AiChatConversationListRequest {
  agentId: string
}

/**
 * Agent 信息
 */
export interface AiChatAgent {
  id: string
  name: string
  description?: string | null
}

/**
 * 对话列表条目
 */
export interface AiChatConversation {
  id: string
  agentId: string
  title?: string | null
  providerId: string
  modelId: string
  updatedAt: string
  messageCount: number
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
  payload: LangchainClientToolCallPayload
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
  payload: LangchainClientToolResultPayload
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
  | NodeStartEvent
  | NodeResultEvent
  | NodeErrorEvent
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
   * 创建助手
   */
  createAgent: (request: AiChatCreateAgentRequest) => Promise<ApiResponse<AiChatAgent>>

  /**
   * 创建对话
   */
  createConversation: (
    request: AiChatCreateConversationRequest
  ) => Promise<ApiResponse<AiChatConversation>>

  /**
   * 获取 Agent 列表
   */
  agents: () => Promise<ApiResponse<AiChatAgent[]>>

  /**
   * 获取指定 Agent 下的对话列表
   */
  conversations: (
    request: AiChatConversationListRequest
  ) => Promise<ApiResponse<AiChatConversation[]>>

  /**
   * 订阅流式事件
   * 返回 unsubscribe 函数
   */
  onStream: (handler: (event: AiChatStreamEvent) => void) => () => void
}
