/**
 * Chat Message DataSource
 *
 * 负责消息相关的数据转换和映射
 */
import type { AiChatMessage, AiChatStreamEvent } from '@preload/types'
import type { ChatMessage, MessageBlock, ThinkingStep } from './types'

function mapReasoningToSteps(reasoning?: string | null): ThinkingStep[] | undefined {
  if (!reasoning) return undefined
  const lines = reasoning
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  return lines.map((content, idx) => ({ id: `reasoning-${idx}`, content }))
}

export function mapMessage(row: AiChatMessage): ChatMessage | null {
  if (row.role !== 'user' && row.role !== 'assistant') return null
  const blocks: MessageBlock[] = []

  if (row.text) {
    blocks.push({ type: 'text', content: row.text })
  }

  const thinkingSteps = mapReasoningToSteps(row.reasoning)
  if (thinkingSteps && thinkingSteps.length > 0) {
    blocks.push({ type: 'thinking', steps: thinkingSteps, isThinking: false })
  }

  return {
    id: row.id,
    role: row.role,
    blocks,
    createdAt: row.createdAt,
    status: row.status,
    isStreaming: row.status === 'streaming'
  }
}

export const ChatMessageDataSource = {
  /**
   * 订阅流式事件
   */
  subscribeStream(handler: (event: AiChatStreamEvent) => void): () => void {
    return window.api.aiChat.onStream(handler)
  }
}
