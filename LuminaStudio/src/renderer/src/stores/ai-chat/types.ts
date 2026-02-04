/**
 * AI Chat Store UI 类型定义
 *
 * 注意：跨进程类型定义在 @preload/types 中
 */

export interface ThinkingStep {
  id: string
  content: string
}
export interface ToolResultItem {
  title: string
  snippet?: string
}

export interface ToolCallResult {
  results?: ToolResultItem[]
  [key: string]: unknown
}

export interface ToolCall {
  id: string
  name: string
  input: unknown
  argsText?: string
  result?: ToolCallResult
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  reasoningTokens?: number
  totalTokens: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinkingSteps?: ThinkingStep[]
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  isThinking?: boolean
  usage?: TokenUsage
  createdAt?: string
  status?: 'final' | 'streaming' | 'aborted' | 'error'
}

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
