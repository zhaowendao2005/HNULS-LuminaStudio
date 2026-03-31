import type { NormalChatTaskFinalResponse } from '@preload/types'
import { NormalChatActionRunsRepository } from '../../repositories/action-runs.repository'
import { NormalChatAgentRunsRepository } from '../../repositories/agent-runs.repository'
import { NormalChatModelCallsRepository } from '../../repositories/model-calls.repository'
import { NormalChatTasksRepository } from '../../repositories/tasks.repository'
import { nowIso } from '../../shared/utils'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'

export interface PendingTask {
  requestId: string
  taskId: string
  topicId: string
  controller: AbortController
}

export class NormalChatTaskScheduler {
  private readonly pendingTasks = new Map<string, PendingTask>()

  constructor(
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly actionRunsRepository: NormalChatActionRunsRepository,
    private readonly modelCallsRepository: NormalChatModelCallsRepository,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  markInterruptedTasksFailed(): void {
    const timestamp = nowIso()
    this.tasksRepository.markInterruptedTasksFailed(timestamp)
    this.agentRunsRepository.markInterruptedRunsFailed(timestamp)
    this.actionRunsRepository.markInterruptedActionsFailed(timestamp)
    this.modelCallsRepository.markInterruptedCallsFailed(timestamp)
  }

  registerPendingTask(
    requestId: string,
    taskId: string,
    topicId: string,
    controller: AbortController
  ): void {
    this.pendingTasks.set(requestId, { requestId, taskId, topicId, controller })
  }

  clearPendingTask(requestId: string): void {
    this.pendingTasks.delete(requestId)
  }

  abort(requestId: string): void {
    const pendingTask = this.pendingTasks.get(requestId)
    if (!pendingTask) {
      return
    }

    pendingTask.controller.abort()
    this.pendingTasks.delete(requestId)

    const timestamp = nowIso()
    const finalResponse: NormalChatTaskFinalResponse = {
      chunks: [],
      finalText: '',
      aborted: true,
      errorMessage: null,
      completedAt: timestamp,
      assistantMessageId: null
    }

    this.agentRunsRepository.markAbortedByTask(pendingTask.taskId, timestamp)
    this.actionRunsRepository.markAbortedByTask(pendingTask.taskId, timestamp)
    this.modelCallsRepository.markAbortedByTask(pendingTask.taskId, timestamp)
    const finishSeq = this.streamPublisher.publish(
      pendingTask.taskId,
      pendingTask.topicId,
      requestId,
      {
        type: 'finish',
        requestId,
        topicId: pendingTask.topicId,
        assistantMessageId: null
      }
    )
    this.tasksRepository.markAborted(pendingTask.taskId, finalResponse, finishSeq, timestamp)
  }

  fail(requestId: string, errorMessage: string): void {
    const pendingTask = this.pendingTasks.get(requestId)
    if (!pendingTask) {
      return
    }

    this.pendingTasks.delete(requestId)

    const timestamp = nowIso()
    const finalResponse: NormalChatTaskFinalResponse = {
      chunks: [],
      finalText: '',
      aborted: false,
      errorMessage,
      completedAt: timestamp,
      assistantMessageId: null
    }

    this.streamPublisher.publish(pendingTask.taskId, pendingTask.topicId, requestId, {
      type: 'error',
      requestId,
      topicId: pendingTask.topicId,
      message: errorMessage,
      rawErrorJson: null
    })
    const finishSeq = this.streamPublisher.publish(
      pendingTask.taskId,
      pendingTask.topicId,
      requestId,
      {
        type: 'finish',
        requestId,
        topicId: pendingTask.topicId,
        assistantMessageId: null
      }
    )
    this.tasksRepository.markFailed(
      pendingTask.taskId,
      errorMessage,
      finalResponse,
      finishSeq,
      timestamp
    )
  }
}
