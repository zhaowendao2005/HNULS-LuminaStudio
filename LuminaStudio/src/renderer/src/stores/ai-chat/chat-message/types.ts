/**
 * Chat Message 模块类型定义（Block 架构）
 *
 * 核心思想：
 * - Message 只是一条容器（role + blocks）
 * - 所有流式输出都被拆成 block（text / thinking / tool / node / meta）
 */

import type {
  LangchainClientNodeErrorPayload,
  LangchainClientNodeResultPayload,
  LangchainClientNodeStartPayload,
  LangchainClientToolCallPayload
} from '@shared/langchain-client.types'

export interface ThinkingStep {
  id: string
  content: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  reasoningTokens?: number
  totalTokens: number
}

// ==================== Blocks ====================

export type MessageBlockType = 'text' | 'thinking' | 'tool' | 'node' | 'meta'

export interface TextBlock {
  type: 'text'
  content: string
}

export interface ThinkingBlock {
  type: 'thinking'
  steps: ThinkingStep[]
  isThinking: boolean
}

export interface ToolBlock {
  type: 'tool'
  call: LangchainClientToolCallPayload
  argsText?: string
  result?: unknown
}

export interface NodeBlock {
  type: 'node'
  start: LangchainClientNodeStartPayload
  result?: LangchainClientNodeResultPayload
  error?: LangchainClientNodeErrorPayload
}

export interface MetaBlock {
  type: 'meta'
  usage?: TokenUsage
}

export type MessageBlock = TextBlock | ThinkingBlock | ToolBlock | NodeBlock | MetaBlock

// ==================== Chat Message ====================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'test'
  blocks: MessageBlock[]
  isStreaming?: boolean
  createdAt?: string
  status?: 'final' | 'streaming' | 'aborted' | 'error'
  rawData?: any // 用于测试消息的原始IPC数据
}
