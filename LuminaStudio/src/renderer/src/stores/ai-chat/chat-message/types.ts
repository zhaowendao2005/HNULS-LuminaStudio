/**
 * Chat Message 模块类型定义
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
  role: 'user' | 'assistant' | 'test'
  content: string
  thinkingSteps?: ThinkingStep[]
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  isThinking?: boolean
  usage?: TokenUsage
  createdAt?: string
  status?: 'final' | 'streaming' | 'aborted' | 'error'
  rawData?: any // 用于测试消息的原始IPC数据
}
