/**
 * Chat Message DataSource
 *
 * 负责消息相关的数据转换和映射
 */
import type { AiChatMessage, AiChatStreamEvent } from '@preload/types'
import type { ChatMessage, ThinkingStep } from './types'

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

  return {
    id: row.id,
    role: row.role,
    content: row.text ?? '',
    createdAt: row.createdAt,
    status: row.status,
    thinkingSteps: mapReasoningToSteps(row.reasoning),
    isStreaming: row.status === 'streaming',
    isThinking: false
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
