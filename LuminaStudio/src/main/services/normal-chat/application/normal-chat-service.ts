import type {
  NormalChatAssistant,
  NormalChatBootstrap,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatRequestDebugSnapshot,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest,
  NormalChatTopic,
  NormalChatTopicTranscriptSnapshot,
  NormalChatWorkspaceSnapshot
} from '@preload/types'
import type { PaperRetrievalService } from '@main/services/paper-retrieval'
import type { ModelConfigService } from '@main/services/model-config'
import type { DatabaseManager } from '../../database-sqlite'
import { NormalChatConversationConfigService } from '../conversation/conversation-config-service'
import { NormalChatConversationService } from '../conversation/conversation-service'
import { NormalChatAssistantActionPoliciesRepository } from '../repositories/assistant-action-policies.repository'
import { NormalChatAssistantsRepository } from '../repositories/assistants.repository'
import { NormalChatConversationsRepository } from '../repositories/conversations.repository'
import { NormalChatLabelsRepository } from '../repositories/labels.repository'
import { NormalChatRequestEntriesRepository } from '../repositories/request-entries.repository'
import { NormalChatRequestHeadsRepository } from '../repositories/request-heads.repository'
import { NormalChatTopicsRepository } from '../repositories/topics.repository'
import { NormalChatWorkspaceStateRepository } from '../repositories/workspace-state.repository'
import { NormalChatAgentRuntime } from '../runtime/agent/agent-runtime'
import { NormalChatRoundPersistenceService } from '../runtime/agent/round-persistence.service'
import { NormalChatAssistantOutputParser } from '../runtime/agent/response/assistant-output-parser'
import { NormalChatAgentGraphRunner } from '../runtime/agent/graph/runner'
import { NormalChatActionExecutorService } from '../runtime/actions/shared/action-executor.service'
import { NormalChatActionResolutionService } from '../runtime/actions/shared/action-resolution.service'
import { NormalChatLoadedActionSpecService } from '../runtime/actions/shared/loaded-action-spec.service'
import {
  NormalChatPubmedSearchAdapter,
  NormalChatPubmedSearchExecutor
} from '../runtime/actions/functioncall/pubmed-search'
import { NormalChatRealModelAdapter } from '../runtime/llm/real-model-adapter'
import { NormalChatPromptBuilder } from '../runtime/prompt/prompt-builder'
import { NormalChatQueueExecutor } from '../runtime/scheduler/queue-executor'
import { NormalChatRuntimeService } from '../runtime/runtime-service'
import { NormalChatTaskScheduler } from '../runtime/scheduler/task-scheduler'
import { NormalChatStreamPublisher } from '../runtime/streaming/stream-publisher'
import { NormalChatWorkspaceService } from '../workspace/workspace-service'

export class NormalChatService {
  private readonly streamPublisher: NormalChatStreamPublisher
  private readonly workspaceService: NormalChatWorkspaceService
  private readonly conversationService: NormalChatConversationService
  private readonly runtimeService: NormalChatRuntimeService

  constructor(
    databaseManager: DatabaseManager,
    paperRetrievalService: PaperRetrievalService,
    modelConfigService: ModelConfigService
  ) {
    const db = databaseManager.getDatabase('userdata')

    const labelsRepository = new NormalChatLabelsRepository(db)
    const assistantsRepository = new NormalChatAssistantsRepository(db)
    const assistantActionPoliciesRepository = new NormalChatAssistantActionPoliciesRepository(db)
    const topicsRepository = new NormalChatTopicsRepository(db)
    const workspaceStateRepository = new NormalChatWorkspaceStateRepository(db)
    const conversationsRepository = new NormalChatConversationsRepository(db)
    const actionResolutionService = new NormalChatActionResolutionService()
    const requestHeadsRepository = new NormalChatRequestHeadsRepository(db)
    const requestEntriesRepository = new NormalChatRequestEntriesRepository(db)

    this.streamPublisher = new NormalChatStreamPublisher(
      requestHeadsRepository,
      requestEntriesRepository
    )

    const taskScheduler = new NormalChatTaskScheduler(requestHeadsRepository, this.streamPublisher)

    this.workspaceService = new NormalChatWorkspaceService(
      db,
      labelsRepository,
      assistantsRepository,
      assistantActionPoliciesRepository,
      topicsRepository,
      workspaceStateRepository,
      taskScheduler
    )

    this.conversationService = new NormalChatConversationService(
      requestHeadsRepository,
      requestEntriesRepository
    )

    const promptBuilder = new NormalChatPromptBuilder()
    const queueExecutor = new NormalChatQueueExecutor(20)
    const actionExecutor = new NormalChatActionExecutorService(
      new NormalChatPubmedSearchExecutor(new NormalChatPubmedSearchAdapter(paperRetrievalService))
    )
    const agentRuntime = new NormalChatAgentRuntime(
      new NormalChatAgentGraphRunner(),
      promptBuilder,
      new NormalChatRealModelAdapter(modelConfigService),
      new NormalChatAssistantOutputParser(),
      actionResolutionService,
      new NormalChatLoadedActionSpecService(),
      actionExecutor,
      new NormalChatRoundPersistenceService(this.streamPublisher),
      this.streamPublisher
    )
    actionExecutor.setSubAgentRunner(agentRuntime)

    this.runtimeService = new NormalChatRuntimeService(
      db,
      this.workspaceService,
      new NormalChatConversationConfigService(conversationsRepository),
      requestHeadsRepository,
      requestEntriesRepository,
      taskScheduler,
      queueExecutor,
      agentRuntime,
      this.streamPublisher
    )

    this.workspaceService.ensureSeedData()
    this.runtimeService.markInterruptedTasksFailed()
  }

  setStreamEmitter(emitter: (event: NormalChatConversationStreamEvent) => void): void {
    this.streamPublisher.setEmitter(emitter)
  }

  setTraceEntryEmitter(
    emitter: (entry: import('@preload/types').NormalChatRequestEntry) => void
  ): void {
    this.streamPublisher.setTraceEntryEmitter(emitter)
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
    persistencePreset?: NormalChatAssistant['persistencePreset']
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

  async deleteAssistant(assistantId: string): Promise<NormalChatWorkspaceSnapshot> {
    return this.workspaceService.deleteAssistant(assistantId)
  }

  createTopic(assistantId: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.createTopic(assistantId)
  }

  renameTopic(assistantId: string, topicId: string, title: string): NormalChatWorkspaceSnapshot {
    return this.workspaceService.renameTopic(assistantId, topicId, title)
  }

  async deleteTopic(assistantId: string, topicId: string): Promise<NormalChatWorkspaceSnapshot> {
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

  getTopicTranscript(topicId: string): NormalChatTopicTranscriptSnapshot {
    return this.conversationService.getTopicTranscript(topicId)
  }

  getRequestDebugSnapshot(requestId: string): NormalChatRequestDebugSnapshot {
    return this.conversationService.getRequestDebugSnapshot(requestId)
  }

  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    return this.runtimeService.sendMessage(payload)
  }

  deleteConversationTurn(requestId: string): void {
    this.conversationService.deleteConversationTurn(requestId)
  }

  async abort(requestId: string): Promise<void> {
    await this.runtimeService.abort(requestId)
  }
}
