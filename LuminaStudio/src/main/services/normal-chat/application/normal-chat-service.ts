import type { DatabaseManager } from '../../database-sqlite'
import { NormalChatAgentRunsRepository } from '../repositories/agent-runs.repository'
import { NormalChatAssistantActionPoliciesRepository } from '../repositories/assistant-action-policies.repository'
import { NormalChatAssistantsRepository } from '../repositories/assistants.repository'
import { NormalChatLabelsRepository } from '../repositories/labels.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatRuntimeEventsRepository } from '../repositories/runtime-events.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { NormalChatTopicsRepository } from '../repositories/topics.repository'
import { NormalChatTurnTracesRepository } from '../repositories/turn-traces.repository'
import { NormalChatWorkspaceStateRepository } from '../repositories/workspace-state.repository'
import { NormalChatConversationService } from '../conversation/conversation-service'
import { NormalChatAgentRuntime } from '../runtime/agent/agent-runtime'
import { NormalChatAgentGraphRunner } from '../runtime/agent/graph/runner'
import { NormalChatStubExecutor } from '../runtime/executor/stub-executor'
import { NormalChatPromptBuilder } from '../runtime/prompt/prompt-builder'
import { NormalChatRuntimeService } from '../runtime/runtime-service'
import { NormalChatTaskScheduler } from '../runtime/scheduler/task-scheduler'
import { NormalChatStreamPublisher } from '../runtime/streaming/stream-publisher'
import { NormalChatWorkspaceService } from '../workspace/workspace-service'
import type {
  NormalChatAssistant,
  NormalChatBootstrap,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatConversationTurnDetail,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest,
  NormalChatTopic,
  NormalChatWorkspaceSnapshot
} from '@preload/types'

// 对外仍保留同一个 Service 入口，IPC / preload 无需感知内部拆分。
// 这个类本身不承载业务逻辑，只负责组装依赖并把请求分发到对应子域。
export class NormalChatService {
  private readonly streamPublisher: NormalChatStreamPublisher
  private readonly workspaceService: NormalChatWorkspaceService
  private readonly conversationService: NormalChatConversationService
  private readonly runtimeService: NormalChatRuntimeService

  constructor(databaseManager: DatabaseManager) {
    // 这里集中完成依赖装配，避免上层调用方关心 normal-chat 内部目录结构。
    const db = databaseManager.getDatabase('userdata')

    const labelsRepository = new NormalChatLabelsRepository(db)
    const assistantsRepository = new NormalChatAssistantsRepository(db)
    const assistantActionPoliciesRepository = new NormalChatAssistantActionPoliciesRepository(db)
    const topicsRepository = new NormalChatTopicsRepository(db)
    const workspaceStateRepository = new NormalChatWorkspaceStateRepository(db)
    const messagesRepository = new NormalChatMessagesRepository(db)
    const turnTracesRepository = new NormalChatTurnTracesRepository(db)
    const tasksRepository = new NormalChatTasksRepository(db)
    const agentRunsRepository = new NormalChatAgentRunsRepository(db)
    const runtimeEventsRepository = new NormalChatRuntimeEventsRepository(db)

    this.streamPublisher = new NormalChatStreamPublisher(runtimeEventsRepository)

    this.workspaceService = new NormalChatWorkspaceService(
      db,
      labelsRepository,
      assistantsRepository,
      assistantActionPoliciesRepository,
      topicsRepository,
      workspaceStateRepository
    )

    this.conversationService = new NormalChatConversationService(
      db,
      messagesRepository,
      turnTracesRepository,
      tasksRepository
    )

    const taskScheduler = new NormalChatTaskScheduler(
      db,
      tasksRepository,
      agentRunsRepository,
      turnTracesRepository,
      this.streamPublisher
    )
    const stubExecutor = new NormalChatStubExecutor(
      db,
      messagesRepository,
      turnTracesRepository,
      tasksRepository,
      agentRunsRepository,
      this.streamPublisher
    )
    const agentRuntime = new NormalChatAgentRuntime(
      new NormalChatAgentGraphRunner(),
      stubExecutor,
      taskScheduler
    )

    this.runtimeService = new NormalChatRuntimeService(
      db,
      this.workspaceService,
      messagesRepository,
      turnTracesRepository,
      tasksRepository,
      agentRunsRepository,
      new NormalChatPromptBuilder(),
      taskScheduler,
      agentRuntime
    )

    this.workspaceService.ensureSeedData()
    this.runtimeService.markInterruptedTasksFailed()
  }

  setStreamEmitter(emitter: (event: NormalChatConversationStreamEvent) => void): void {
    this.streamPublisher.setEmitter(emitter)
  }

  getBootstrap(): NormalChatBootstrap {
    return this.workspaceService.getBootstrap()
  }

  createAssistant(): NormalChatWorkspaceSnapshot {
    return this.workspaceService.createAssistant()
  }

  updateAssistant(payload: {
    assistantId: string
    name?: string
    defaultSystemPrompt?: string
    streamingEnabled?: boolean
    callMode?: NormalChatAssistant['callMode']
    costMode?: NormalChatAssistant['costMode']
    defaultModelProviderId?: string | null
    defaultModelId?: string | null
    contextMemoryRounds?: number
    maxRecursionDepth?: number
    maxReasoningSteps?: number
    systemActionFunctionCallEnabled?: boolean
    systemActionSubAgentEnabled?: boolean
    functionCallPubMedEnabled?: boolean
    functionCallPubMedMode?: NormalChatAssistant['functionCallPubMedMode']
    mcpEnabled?: boolean
  }): NormalChatWorkspaceSnapshot {
    return this.workspaceService.updateAssistant(payload)
  }

  assignLabel(assistantId: string, labelId: string | null): NormalChatWorkspaceSnapshot {
    return this.workspaceService.assignLabel(assistantId, labelId)
  }

  createLabel(name: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.createLabel(name)
  }

  renameLabel(labelId: string, name: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.renameLabel(labelId, name)
  }

  deleteLabel(labelId: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.deleteLabel(labelId)
  }

  setActiveAssistant(assistantId: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.setActiveAssistant(assistantId)
  }

  createTopic(assistantId: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.createTopic(assistantId)
  }

  renameTopic(assistantId: string, topicId: string, title: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.renameTopic(assistantId, topicId, title)
  }

  deleteTopic(assistantId: string, topicId: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.deleteTopic(assistantId, topicId)
  }

  setActiveTopic(assistantId: string, topicId: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.setActiveTopic(assistantId, topicId)
  }

  updateTopicPrompt(payload: {
    assistantId: string
    topicId: string
    mode: NormalChatTopic['systemPromptMode']
    promptOverride?: string | null
  }): NormalChatWorkspaceSnapshot {
    return this.workspaceService.updateTopicPrompt(payload)
  }

  updateTopicStreaming(payload: {
    assistantId: string
    topicId: string
    mode: NormalChatTopic['streamingMode']
    streamingEnabledOverride?: boolean | null
  }): NormalChatWorkspaceSnapshot {
    return this.workspaceService.updateTopicStreaming(payload)
  }

  updateTopicConfig(
    payload: Partial<NormalChatTopic> & { assistantId: string; topicId: string }
  ): NormalChatWorkspaceSnapshot {
    return this.workspaceService.updateTopicConfig(payload)
  }

  getConversation(topicId: string): NormalChatConversationSnapshot {
    return this.conversationService.getConversation(topicId)
  }

  getConversationTurnDetail(requestId: string): NormalChatConversationTurnDetail | null {
    return this.conversationService.getConversationTurnDetail(requestId)
  }

  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    return this.runtimeService.sendMessage(payload)
  }

  deleteConversationTurn(requestId: string): void {
    this.conversationService.deleteConversationTurn(requestId)
  }

  abort(requestId: string): void {
    this.runtimeService.abort(requestId)
  }
}
