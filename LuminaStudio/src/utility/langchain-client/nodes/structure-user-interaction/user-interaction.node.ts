/**
 * ======================================================================
 * 用户交互节点 (Structure Node) - 通用人机交互点
 * ======================================================================
 *
 * 职责：
 * - 将 LLM 生成的交互请求（消息 + 可选选项）发送给用户
 * - 暂停 graph 执行，等待用户通过 UI 响应
 * - 将用户响应回传给 graph state，供后续节点消费
 *
 * 通用性：
 * - 节点本身不包含任何业务逻辑，仅做"发送请求 → 等待 → 收集响应"
 * - 交互内容（选项/消息）由调用方在 graph 中准备并注入 state
 * - 不同 model 可以用不同方式组装交互请求
 *
 * ────────────────────────────────────────────────────────────────────
 * 调用范例（在 graph.ts 中使用）：
 * ────────────────────────────────────────────────────────────────────
 *
 * import { requestUserInteraction } from '../nodes/structure-user-interaction'
 *
 * // 1. 在 graph State 中定义交互相关字段
 * const State = Annotation.Root({
 *   pendingInteraction: Annotation<UserInteractionRequest | null>({
 *     value: (_l, r) => r,
 *     default: () => null
 *   }),
 *   userResponse: Annotation<UserInteractionResponsePayload | null>({
 *     value: (_l, r) => r,
 *     default: () => null
 *   }),
 * })
 *
 * // 2. 定义 user-interaction 节点
 * const userInteractionNode = async (state: typeof State.State) => {
 *   if (!state.pendingInteraction) {
 *     return { userResponse: null }
 *   }
 *
 *   const response = await requestUserInteraction({
 *     emit: params.emit,
 *     requestId: state.requestId,
 *     nodeId: 'user-interaction-001',
 *     interactionRequest: state.pendingInteraction,
 *     waitForResponse: interactionRegistry.waitForResponse,
 *     abortSignal: state.abortSignal,
 *   })
 *
 *   return { userResponse: response }
 * }
 *
 * // 3. 在后续节点中消费 userResponse
 * const executeNode = async (state: typeof State.State) => {
 *   if (state.userResponse?.action === 'approve') {
 *     // 用户批准，继续执行原计划
 *   } else if (state.userResponse?.action === 'modify') {
 *     // 用户修改，根据 textInput 调整计划
 *   } else {
 *     // 用户拒绝
 *   }
 * }
 * ────────────────────────────────────────────────────────────────────
 */

import { randomUUID } from 'node:crypto'
import type {
  UserInteractionResponsePayload,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type { RequestUserInteractionParams } from './types'

/**
 * 请求用户交互（核心函数）
 *
 * 1. 生成唯一 interactionId
 * 2. 通过 emit 发送 invoke:user-interaction-request 事件（含 node-start）
 * 3. 调用 waitForResponse 阻塞等待用户响应
 * 4. 发送 node-result 事件
 * 5. 返回用户响应
 *
 * @throws AbortError - 如果 abortSignal 被触发
 */
export async function requestUserInteraction(
  params: RequestUserInteractionParams
): Promise<UserInteractionResponsePayload> {
  const { emit, requestId, nodeId, interactionRequest, waitForResponse, abortSignal } = params

  const interactionId = randomUUID()

  // 1. 发送 node-start 事件（让 UI 显示交互节点正在等待）
  emit({
    type: 'invoke:node-start',
    requestId,
    payload: {
      nodeId,
      nodeKind: 'user_interaction',
      label: '用户交互',
      startedAt: new Date().toISOString(),
      inputs: {
        message: interactionRequest.message,
        options: interactionRequest.options,
        requiresTextInput: interactionRequest.requiresTextInput ?? true
      }
    }
  })

  // 2. 发送交互请求事件（UI 渲染交互组件）
  emit({
    type: 'invoke:user-interaction-request',
    requestId,
    payload: {
      interactionId,
      nodeId,
      message: interactionRequest.message,
      options: interactionRequest.options,
      requiresTextInput: interactionRequest.requiresTextInput ?? true,
      metadata: interactionRequest.metadata
    }
  })

  // 3. 等待用户响应（Promise 阻塞，由 IPC 桥接 resolve）
  let response: UserInteractionResponsePayload

  if (abortSignal) {
    response = await Promise.race([
      waitForResponse(interactionId),
      new Promise<never>((_, reject) => {
        if (abortSignal.aborted) {
          reject(new DOMException('User interaction aborted', 'AbortError'))
          return
        }
        abortSignal.addEventListener(
          'abort',
          () => {
            reject(new DOMException('User interaction aborted', 'AbortError'))
          },
          { once: true }
        )
      })
    ])
  } else {
    response = await waitForResponse(interactionId)
  }

  // 4. 发送 node-result 事件
  emit({
    type: 'invoke:node-result',
    requestId,
    payload: {
      nodeId,
      nodeKind: 'user_interaction',
      label: '用户交互',
      finishedAt: new Date().toISOString(),
      outputs: {
        action: response.action,
        selectedOptionIds: response.selectedOptionIds,
        hasTextInput: Boolean(response.textInput)
      }
    }
  })

  return response
}
