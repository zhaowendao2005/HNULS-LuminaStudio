import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatConversationRuntimeTrace,
  NormalChatConversationTurnResponseRecord,
  NormalChatRequestMetrics
} from '@preload/types'
import { NormalChatAgentRunsRepository } from '../../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../../repositories/messages.repository'
import { NormalChatTasksRepository } from '../../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../../repositories/turn-traces.repository'
import { nowIso } from '../../shared/utils'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'

export interface NormalChatStubExecutorInput {
  taskId: string
  requestId: string
  topicId: string
  assistant: NormalChatAssistant
  providerId: string
  modelId: string
  onSettled(): void
}

// stub executor 模拟后端，按照定时器顺序推送 status/progress/chunk/trace/message 事件并更新数据库。
export class NormalChatStubExecutor {
  constructor(
    private readonly db: Database.Database,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  // 生成一组 timer，后续可以通过 scheduler 统一清理或 abort。
  createSchedule(input: NormalChatStubExecutorInput): ReturnType<typeof setTimeout>[] {
    // 构造简单 metrics trace 用于 trace upsert。
    const metrics: NormalChatRequestMetrics = {
      providerId: input.providerId,
      providerName: input.providerId,
      modelId: input.modelId,
      modelName: input.modelId,
      firstTokenLatencyMs: 120,
      promptTokens: 320,
      completionTokens: 120,
      totalTokens: 440,
      modelCallCount: 1,
      streamingEnabled: input.assistant.streamingEnabled
    }

    // runtime trace 记录当前为 backend stub，每步 timer 会上报一次。
    const runtimeTrace: NormalChatConversationRuntimeTrace = {
      traceVersion: 1,
      agentTree: null,
      metrics,
      execution: {
        mode: 'backend-stub',
        taskId: input.taskId
      }
    }

    const chunks = [
      'Normal Chat 真实后端链路已经接通。\n\n',
      '当前回复仍然是 main 侧 stub，用来替换默认 mock datasource，并验证入库、IPC 与流式事件链。'
    ]

    // 三个 timer 分别负责变更状态、chunk 更新、最终结果并 commit。
    const timers: ReturnType<typeof setTimeout>[] = []

    // 第一步：标记 task/agent 进入 running 并发送 thinking status。
    timers.push(
      setTimeout(() => {
        const timestamp = nowIso()
        this.tasksRepository.markRunning(input.taskId, timestamp)
        this.agentRunsRepository.markRunning(input.taskId, timestamp)
        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'status',
          requestId: input.requestId,
          topicId: input.topicId,
          phase: 'thinking',
          message: 'Normal Chat backend stub is preparing a response.'
        })
      }, 20)
    )

    // 第二步：模拟流式进度和首个 chunk。
    timers.push(
      setTimeout(() => {
        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'assistant-progress',
          requestId: input.requestId,
          topicId: input.topicId,
          message: 'Streaming backend stub output.'
        })
        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'assistant-final-chunk',
          requestId: input.requestId,
          topicId: input.topicId,
          delta: chunks[0]
        })
      }, 120)
    )

    // 第三步：再推送第二个 chunk，并把 runtime trace 写入。
    timers.push(
      setTimeout(() => {
        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'assistant-final-chunk',
          requestId: input.requestId,
          topicId: input.topicId,
          delta: chunks[1]
        })
        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'runtime-trace-upsert',
          requestId: input.requestId,
          topicId: input.topicId,
          runtimeTrace
        })
      }, 220)
    )

    // 第四步：完成后进 assistant message、更新 trace/task/agent，再发 message-committed 和 finish。
    timers.push(
      setTimeout(() => {
        const timestamp = nowIso()
        const assistantMessage: NormalChatConversationMessage = {
          id: randomUUID(),
          topicId: input.topicId,
          requestId: input.requestId,
          role: 'assistant',
          parts: [{ kind: 'text', text: `${chunks[0]}${chunks[1]}` }],
          createdAt: timestamp,
          updatedAt: timestamp
        }

        const responseRecord: NormalChatConversationTurnResponseRecord = {
          chunks,
          finalText: `${chunks[0]}${chunks[1]}`,
          aborted: false,
          errorMessage: null,
          completedAt: timestamp
        }

        const transaction = this.db.transaction(() => {
          this.messagesRepository.insert(assistantMessage)
          this.turnTracesRepository.updateResponseAndRuntimeTrace(
            input.requestId,
            responseRecord,
            runtimeTrace,
            timestamp
          )
          this.tasksRepository.markCompleted(input.taskId, assistantMessage.id, timestamp)
          this.agentRunsRepository.markCompleted(input.taskId, responseRecord.finalText, timestamp)
        })
        transaction()

        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'message-committed',
          requestId: input.requestId,
          topicId: input.topicId,
          message: assistantMessage
        })
        this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
          type: 'finish',
          requestId: input.requestId,
          topicId: input.topicId,
          assistantMessageId: assistantMessage.id
        })
        input.onSettled()
      }, 320)
    )

    return timers
  }
}
