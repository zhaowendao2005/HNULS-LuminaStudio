import { NormalChatRequestHeadsRepository } from '../../repositories/request-heads.repository'
import { nowIso } from '../../shared/utils'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'

export interface PendingTask {
  requestId: string
  taskId: string
  topicId: string
  controller: AbortController
  completionPromise: Promise<void>
  resolveCompletion: () => void
  settled: boolean
}

export class NormalChatTaskScheduler {
  private readonly pendingTasks = new Map<string, PendingTask>()

  constructor(
    private readonly requestHeadsRepository: NormalChatRequestHeadsRepository,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  markInterruptedTasksFailed(): void {
    const timestamp = nowIso()
    for (const head of this.requestHeadsRepository.listByStatuses(['queued', 'running'])) {
      this.streamPublisher.appendTraceEntry({
        requestId: head.requestId,
        entityKind: 'request',
        entityId: head.requestId,
        parentEntityId: null,
        op: 'failed',
        visibility: 'internal',
        payload: {
          kind: 'request_failed',
          message: 'Request interrupted by application restart.',
          rawErrorJson: null
        },
        createdAt: timestamp,
        updateHead: {
          status: 'failed',
          phase: 'finished',
          errorMessage: 'Request interrupted by application restart.',
          finishedAt: timestamp
        }
      })
    }
  }

  registerPendingTask(
    requestId: string,
    taskId: string,
    topicId: string,
    controller: AbortController
  ): void {
    let resolveCompletion: () => void = () => undefined
    const completionPromise = new Promise<void>((resolve) => {
      resolveCompletion = resolve
    })

    this.pendingTasks.set(requestId, {
      requestId,
      taskId,
      topicId,
      controller,
      completionPromise,
      resolveCompletion,
      settled: false
    })
  }

  clearPendingTask(requestId: string): void {
    const pendingTask = this.pendingTasks.get(requestId)
    if (pendingTask && !pendingTask.settled) {
      pendingTask.settled = true
      pendingTask.resolveCompletion()
    }
    this.pendingTasks.delete(requestId)
    this.streamPublisher.clearPersistence(requestId)
  }

  async abort(requestId: string): Promise<void> {
    const pendingTask = this.pendingTasks.get(requestId)
    if (!pendingTask) {
      return
    }

    pendingTask.controller.abort()

    const timestamp = nowIso()
    this.requestHeadsRepository.updateStatus({
      requestId,
      status: 'aborted',
      phase: 'finished',
      errorMessage: null,
      finishedAt: timestamp,
      updatedAt: timestamp
    })
    this.streamPublisher.publish(pendingTask.taskId, pendingTask.topicId, requestId, {
      type: 'finish',
      requestId,
      topicId: pendingTask.topicId,
      assistantMessageId: null
    })
    await pendingTask.completionPromise.catch(() => undefined)
  }

  async abortByTopicIds(topicIds: readonly string[]): Promise<void> {
    if (topicIds.length === 0) {
      return
    }

    const topicIdSet = new Set(topicIds)
    const matchingTasks = Array.from(this.pendingTasks.values()).filter((task) =>
      topicIdSet.has(task.topicId)
    )

    for (const task of matchingTasks) {
      await this.abort(task.requestId)
    }
  }

  fail(requestId: string, errorMessage: string): void {
    const pendingTask = this.pendingTasks.get(requestId)
    if (!pendingTask) {
      return
    }

    if (!pendingTask.settled) {
      pendingTask.settled = true
      pendingTask.resolveCompletion()
    }
    this.pendingTasks.delete(requestId)

    const timestamp = nowIso()
    this.streamPublisher.appendTraceEntry({
      requestId,
      entityKind: 'request',
      entityId: requestId,
      parentEntityId: null,
      op: 'failed',
      visibility: 'internal',
      payload: {
        kind: 'request_failed',
        message: errorMessage,
        rawErrorJson: null
      },
      createdAt: timestamp,
      updateHead: {
        status: 'failed',
        phase: 'finished',
        errorMessage,
        finishedAt: timestamp
      }
    })
    this.streamPublisher.publish(pendingTask.taskId, pendingTask.topicId, requestId, {
      type: 'error',
      requestId,
      topicId: pendingTask.topicId,
      message: errorMessage,
      rawErrorJson: null
    })
    this.streamPublisher.clearPersistence(requestId)
  }
}
