/**
 * AI Chat Store UI 类型定义
 *
 * 注意：跨进程类型定义在 @preload/types 中
 */

// 重新导出消息相关类型
export type {
  ChatMessage,
  MessageBlock,
  MessageBlockType,
  TextBlock,
  ThinkingBlock,
  ToolBlock,
  NodeBlock,
  MetaBlock,
  ThinkingStep,
  TokenUsage
} from './chat-message/types'

export interface AgentInfo {
  id: string
  name: string
  description?: string | null
}

export interface ConversationSummary {
  id: string
  agentId: string
  title?: string | null
  providerId: string
  modelId: string
  updatedAt: string
  messageCount: number
}
