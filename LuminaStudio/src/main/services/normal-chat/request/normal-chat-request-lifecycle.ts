interface ActiveTopicRequestContext {
  requestId: string
  topicId: string
  controller: AbortController
  settled: Promise<void>
  resolveSettled: () => void
}

/**
 * 管理 Normal Chat 的活跃请求生命周期。
 *
 * 约束：
 * 1. 同一个 topic 同时只允许一个活跃请求。
 * 2. 不同 topic 之间允许并行运行。
 * 3. requestId 是运行态唯一标识，topicId 用来做“同话题覆盖”。
 */
export class NormalChatRequestLifecycleManager {
  private readonly requestsById = new Map<string, ActiveTopicRequestContext>()
  private readonly activeRequestIdByTopicId = new Map<string, string>()

  getActiveRequestId(topicId: string): string | null {
    return this.activeRequestIdByTopicId.get(topicId) ?? null
  }

  register(params: {
    requestId: string
    topicId: string
    controller: AbortController
    settled: Promise<void>
    resolveSettled: () => void
  }): void {
    const nextContext: ActiveTopicRequestContext = {
      requestId: params.requestId,
      topicId: params.topicId,
      controller: params.controller,
      settled: params.settled,
      resolveSettled: params.resolveSettled
    }

    this.requestsById.set(params.requestId, nextContext)
    this.activeRequestIdByTopicId.set(params.topicId, params.requestId)
  }

  async abortRequest(requestId: string): Promise<boolean> {
    const active = this.requestsById.get(requestId)
    if (!active) {
      return false
    }

    active.controller.abort()
    await active.settled
    return true
  }

  async abortTopicRequest(topicId: string): Promise<boolean> {
    const requestId = this.getActiveRequestId(topicId)
    if (!requestId) {
      return false
    }

    return this.abortRequest(requestId)
  }

  finalize(requestId: string): void {
    const active = this.requestsById.get(requestId)
    if (!active) {
      return
    }

    active.resolveSettled()
    this.requestsById.delete(requestId)

    if (this.activeRequestIdByTopicId.get(active.topicId) === requestId) {
      this.activeRequestIdByTopicId.delete(active.topicId)
    }
  }
}
