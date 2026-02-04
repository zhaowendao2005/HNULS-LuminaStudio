/**
 * AiChatService 内部类型定义
 * 
 * 注意：跨进程类型定义在 @preload/types 中
 */

/**
 * 数据库中的 conversation 表行
 */
export interface ConversationRow {
  id: string
  agent_id: string
  title: string | null
  provider_id: string
  model_id: string
  enable_thinking: number
  memory_rounds: number
  created_at: string
  updated_at: string
}

/**
 * 数据库中的 agent 表行
 */
export interface AgentRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * 对话列表聚合行
 */
export interface ConversationSummaryRow {
  id: string
  agent_id: string
  title: string | null
  provider_id: string
  model_id: string
  updated_at: string
  message_count: number
}

/**
 * 数据库中的 message 表行
 */
export interface MessageRow {
  id: string
  conversation_id: string
  role: string
  text: string | null
  reasoning: string | null
  content_json: string | null
  status: string
  error: string | null
  created_at: string
}

/**
 * 数据库中的 message_usage 表行
 */
export interface MessageUsageRow {
  message_id: string
  input_tokens: number | null
  output_tokens: number | null
  reasoning_tokens: number | null
  total_tokens: number | null
  provider_metadata_json: string | null
}

/**
 * 流式生成的运行时状态
 */
export interface StreamState {
  requestId: string
  conversationId: string
  providerId: string
  modelId: string
  userMessageId: string
  assistantMessageId: string
  abortController: AbortController
  answerText: string
  reasoningText: string
  startedAt: Date
}
