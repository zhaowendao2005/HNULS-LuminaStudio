/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Chat Message DataSource - 数据源层
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 🎯 职责：
 * 1. 数据转换：将后端数据转换为前端 Block 结构
 * 2. 事件订阅：订阅流式事件，提供给 Store 处理
 *
 * 🔄 为什么需要这一层？
 * - 解耦 Store 和 IPC：Store 不直接依赖 window.api
 * - 数据转换：将数据库/IPC 的数据格式转为 UI 需要的格式
 * - 易于测试：可以 mock DataSource 进行单元测试
 */
import type { AiChatMessage, AiChatStreamEvent } from '@preload/types'
import type { ChatMessage, MessageBlock, ThinkingStep } from './types'

/**
 * 将推理文本转换为推理步骤数组
 *
 * 输入示例：
 * "步骤 1: 分析问题\n步骤 2: 考虑解决方案\n步骤 3: 得出结论"
 *
 * 输出示例：
 * [
 *   { id: 'reasoning-0', content: '步骤 1: 分析问题' },
 *   { id: 'reasoning-1', content: '步骤 2: 考虑解决方案' },
 *   { id: 'reasoning-2', content: '步骤 3: 得出结论' }
 * ]
 */
function mapReasoningToSteps(reasoning?: string | null): ThinkingStep[] | undefined {
  if (!reasoning) return undefined
  // 按换行符分割，去除空行
  const lines = reasoning
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  // 为每一步生成唯一 ID
  return lines.map((content, idx) => ({ id: `reasoning-${idx}`, content }))
}

/**
 * 将数据库消息转换为 ChatMessage
 *
 * 📌 注意：
 * - 这是用于加载历史消息的（从数据库读取）
 * - 流式消息不经过这里，直接在 Store 中动态构建
 *
 * @param row - 数据库中的消息记录
 * @returns ChatMessage 或 null（如果不是有效角色）
 */
export function mapMessage(row: AiChatMessage): ChatMessage | null {
  // 只处理用户和助手消息
  if (row.role !== 'user' && row.role !== 'assistant') return null

  const blocks: MessageBlock[] = []

  // 如果有文本，添加 TextBlock
  if (row.text) {
    blocks.push({ type: 'text', content: row.text })
  }

  // 如果有推理过程，添加 ThinkingBlock
  const thinkingSteps = mapReasoningToSteps(row.reasoning)
  if (thinkingSteps && thinkingSteps.length > 0) {
    blocks.push({ type: 'thinking', steps: thinkingSteps, isThinking: false })
  }

  // 📌 注意：工具调用和节点执行不保存到数据库，只在流式输出时显示

  return {
    id: row.id,
    role: row.role,
    blocks,
    createdAt: row.createdAt,
    status: row.status,
    isStreaming: row.status === 'streaming'
  }
}

/**
 * ChatMessageDataSource - 数据源对象
 *
 * 提供的功能：
 * 1. subscribeStream - 订阅流式事件
 */
export const ChatMessageDataSource = {
  /**
   * 订阅 AI 聊天的流式事件
   *
   * 🔄 事件流转：
   * Main Process (后端) → Preload (IPC 桥) → Renderer (前端)
   *                                │
   *                                └──> window.api.aiChat.onStream
   *                                      │
   *                                      └──> Store.handleStreamEvent
   *
   * @param handler - 事件处理函数
   * @returns 取消订阅的函数
   */
  subscribeStream(handler: (event: AiChatStreamEvent) => void): () => void {
    return window.api.aiChat.onStream(handler)
  }
}
