/**
 * ======================================================================
 * 用户交互节点 - 类型定义
 * ======================================================================
 */

import type {
  UserInteractionRequestPayload,
  UserInteractionResponsePayload,
  UserInteractionOption,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'

// Re-export shared types for convenience
export type { UserInteractionRequestPayload, UserInteractionResponsePayload, UserInteractionOption }

/**
 * 用户交互请求（graph 节点侧构建，传给 requestUserInteraction）
 *
 * 与 UserInteractionRequestPayload 的区别：
 * - 这是节点内部使用的输入格式，不含 interactionId / nodeId（由节点自动生成）
 * - UserInteractionRequestPayload 是 IPC 传输格式，含完整 ID
 */
export interface UserInteractionRequest {
  /** LLM 生成的交互消息（支持 markdown） */
  message: string
  /** 可选的选项列表（LLM 决定是否生成） */
  options?: UserInteractionOption[]
  /** 是否需要文本输入（默认 true） */
  requiresTextInput?: boolean
  /** 节点可附加的额外数据（如规划详情） */
  metadata?: Record<string, unknown>
}

/**
 * requestUserInteraction 的参数
 */
export interface RequestUserInteractionParams {
  /** IPC 发送函数 */
  emit: (msg: LangchainClientToMainMessage) => void
  /** 当前请求 ID */
  requestId: string
  /** 节点 ID（用于 UI 路由） */
  nodeId: string
  /** 交互请求内容（由调用方在 graph 中构建） */
  interactionRequest: UserInteractionRequest
  /**
   * 等待用户响应的 Promise 工厂
   *
   * 由 graph builder 注入，内部通过 IPC 桥接实现。
   * 参数 interactionId 用于匹配请求/响应对。
   */
  waitForResponse: (interactionId: string) => Promise<UserInteractionResponsePayload>
  /** 可选的 AbortSignal（用户中断时取消等待） */
  abortSignal?: AbortSignal
}
