import type { NormalChatAssistant } from '@preload/types'
import type { NormalChatStubExecutorInput } from '../executor/stub-executor'
import { NormalChatStubExecutor } from '../executor/stub-executor'
import { NormalChatTaskScheduler } from '../scheduler/task-scheduler'
import { NormalChatAgentGraphRunner } from './graph/runner'

export interface NormalChatAgentRuntimeStartInput {
  taskId: string
  requestId: string
  topicId: string
  assistant: NormalChatAssistant
  providerId: string
  modelId: string
}

// Agent runtime 负责经过 graph runner 决策后交给 executor 执行，并把 pending task 注册到 scheduler。
export class NormalChatAgentRuntime {
  constructor(
    private readonly graphRunner: NormalChatAgentGraphRunner,
    private readonly stubExecutor: NormalChatStubExecutor,
    private readonly taskScheduler: NormalChatTaskScheduler
  ) {}

  // 每轮 start 执行 graph.run，graph 内部是 if/while 过程式走 start -> execute -> finish。
  start(input: NormalChatAgentRuntimeStartInput): void {
    this.graphRunner.run({
      execute: () => {
        const timers = this.stubExecutor.createSchedule({
          ...input,
          onSettled: () => this.taskScheduler.clearPendingTask(input.requestId)
        } satisfies NormalChatStubExecutorInput)

        // executor 完成后会调用 scheduler 清理，并保持 pending map 供 abort 触发。
        this.taskScheduler.registerPendingTask(input.requestId, input.taskId, input.topicId, timers)
      }
    })
  }
}
