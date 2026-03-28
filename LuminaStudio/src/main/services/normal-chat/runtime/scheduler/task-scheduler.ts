import type { NormalChatConversationTurnResponseRecord } from '@preload/types'
import { NormalChatActionRunsRepository } from '../../repositories/action-runs.repository'
import { NormalChatAgentRunsRepository } from '../../repositories/agent-runs.repository'
import { NormalChatModelCallsRepository } from '../../repositories/model-calls.repository'
import { NormalChatTasksRepository } from '../../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../../repositories/turn-traces.repository'
import { parseJson, nowIso } from '../../shared/utils'
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
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
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

  hasPendingTask(requestId: string): boolean {
    return this.pendingTasks.has(requestId)
  }

  getPendingTaskCount(): number {
    return this.pendingTasks.size
  }

  abort(requestId: string): void {
    const pendingTask = this.pendingTasks.get(requestId)
    if (!pendingTask) {
      return
    }

    pendingTask.controller.abort()
    this.pendingTasks.delete(requestId)

    const timestamp = nowIso()
    const trace = this.turnTracesRepository.getByRequest(requestId)
    const responseRecord = parseJson(trace?.responseRecordJson, {
      chunks: [],
      finalText: '',
      aborted: true,
      errorMessage: null,
      completedAt: timestamp
    } satisfies NormalChatConversationTurnResponseRecord)

    responseRecord.aborted = true
    responseRecord.completedAt = timestamp

    this.tasksRepository.markAborted(pendingTask.taskId, timestamp)
    this.agentRunsRepository.markAborted(pendingTask.taskId, timestamp)
    this.actionRunsRepository.markAbortedByTask(pendingTask.taskId, timestamp)
    this.modelCallsRepository.markAbortedByTask(pendingTask.taskId, timestamp)
    this.turnTracesRepository.updateResponseRecord(requestId, responseRecord, timestamp)
    this.streamPublisher.publish(pendingTask.taskId, pendingTask.topicId, requestId, {
      type: 'finish',
      requestId,
      topicId: pendingTask.topicId,
      assistantMessageId: null
    })
  }
}
