import type Database from 'better-sqlite3'
import type { NormalChatConversationTurnResponseRecord } from '@preload/types'
import { NormalChatAgentRunsRepository } from '../../repositories/agent-runs.repository'
import { NormalChatTasksRepository } from '../../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../../repositories/turn-traces.repository'
import { parseJson, nowIso } from '../../shared/utils'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'

export interface PendingTask {
  requestId: string
  taskId: string
  topicId: string
  timers: ReturnType<typeof setTimeout>[]
}

// Scheduler 负责守住任务状态的生命周期，伴随 timer 和数据库的状态同步保持一致。
// 它在 runtime/sendMessage 启动后注册 pending 任务，在需要 abort 或完成后负责清理和发出 finish 事件。
export class NormalChatTaskScheduler {
  private readonly pendingTasks = new Map<string, PendingTask>()

  constructor(
    private readonly db: Database.Database,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  // 应用启动时检查上次运行的任务，直接把 running 状态视为失败，避免 UI 卡在 loading。
  markInterruptedTasksFailed(): void {
    const timestamp = nowIso()
    this.tasksRepository.markInterruptedTasksFailed(timestamp)
    this.agentRunsRepository.markInterruptedRunsFailed(timestamp)
  }

  // registerPendingTask 注册用来跟踪一轮 stub 调度的 timers，便于后续 abort/finish 的统一清理。
  registerPendingTask(
    requestId: string,
    taskId: string,
    topicId: string,
    timers: ReturnType<typeof setTimeout>[]
  ): void {
    this.pendingTasks.set(requestId, { requestId, taskId, topicId, timers })
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

  // 取消某个还在运行队列里的请求，先关计时器再把 task / agent run / trace 置为 aborted，再发 finish 事件。
  abort(requestId: string): void {
    const pendingTask = this.pendingTasks.get(requestId)
    if (!pendingTask) {
      return
    }

    pendingTask.timers.forEach((timer) => clearTimeout(timer))
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

    const transaction = this.db.transaction(() => {
      this.tasksRepository.markAborted(pendingTask.taskId, timestamp)
      this.agentRunsRepository.markAborted(pendingTask.taskId, timestamp)
      this.turnTracesRepository.updateResponseRecord(requestId, responseRecord, timestamp)
    })
    transaction()

    this.streamPublisher.publish(pendingTask.taskId, pendingTask.topicId, requestId, {
      type: 'finish',
      requestId,
      topicId: pendingTask.topicId,
      assistantMessageId: null
    })
  }
}
