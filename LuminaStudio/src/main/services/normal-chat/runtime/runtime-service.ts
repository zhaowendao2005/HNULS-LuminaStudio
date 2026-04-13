/**
 * Normal Chat 运行时服务
 */
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatKnowledgeRetrievalPolicyInput,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest,
  NormalChatTaskExecutionActionSnapshot,
  NormalChatTaskExecutionSnapshot,
  NormalChatTopic
} from '@preload/types'
import { NormalChatConversationConfigService } from '../conversation/conversation-config-service'
import { NormalChatRequestEntriesRepository } from '../repositories/request-entries.repository'
import { NormalChatRequestHeadsRepository } from '../repositories/request-heads.repository'
import { TopicTranscriptProjector } from '../projectors/topic-transcript.projector'
import { nowIso } from '../shared/utils'
import { NormalChatWorkspaceService } from '../workspace/workspace-service'
import { NormalChatAgentRuntime } from './agent/agent-runtime'
import {
  buildKnowledgeRetrievalPolicyPrompt,
  hasUsableKnowledgeRetrievalPolicy
} from './actions/functioncall/knowledge-retrieval/policy-prompt'
import { NormalChatQueueExecutor } from './scheduler/queue-executor'
import { NormalChatTaskScheduler } from './scheduler/task-scheduler'
import { NormalChatStreamPublisher } from './streaming/stream-publisher'

const DEFAULT_PROMPT_BUDGET_CHARS = 28_000
const DEFAULT_ROUND_MEMORY_WINDOW = 3
const DEFAULT_MAX_REPAIR_ATTEMPTS = 2
const DEFAULT_MAX_PROVIDER_RETRIES = 2

interface NormalChatAgentRunRecord {
  id: string
  taskId: string
  parentAgentRunId: string | null
  depth: number
  roleKind: string
  templateId: string
  goal: string
}

export class NormalChatRuntimeService {
  private readonly topicTranscriptProjector = new TopicTranscriptProjector()

  constructor(
    private readonly db: Database.Database,
    private readonly workspaceService: NormalChatWorkspaceService,
    private readonly conversationConfigService: NormalChatConversationConfigService,
    private readonly requestHeadsRepository: NormalChatRequestHeadsRepository,
    private readonly requestEntriesRepository: NormalChatRequestEntriesRepository,
    private readonly taskScheduler: NormalChatTaskScheduler,
    private readonly queueExecutor: NormalChatQueueExecutor,
    private readonly agentRuntime: NormalChatAgentRuntime,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  markInterruptedTasksFailed(): void {
    this.taskScheduler.markInterruptedTasksFailed()
  }

  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    this.workspaceService.ensureSeedData()

    const topic = this.workspaceService.getTopicById(undefined, payload.topicId)
    const assistant = this.workspaceService.getAssistantById(topic.assistantId)
    const conversation = this.conversationConfigService.resolveOrCreateDefaultConversation(topic)
    const requestId = payload.clientRequestId || `request-${randomUUID()}`
    const userMessageId = randomUUID()
    const rootAgentRunId = randomUUID()
    const timestamp = nowIso()

    const effectiveSystemPrompt =
      topic.systemPromptMode === 'override'
        ? (topic.systemPromptOverride ?? '')
        : assistant.defaultSystemPrompt
    const effectiveContextMemoryRounds = resolveNumericOverride(
      topic.contextMemoryRoundsMode,
      topic.contextMemoryRoundsOverride,
      assistant.contextMemoryRounds
    )
    const effectiveMaxRecursionDepth = resolveNumericOverride(
      topic.maxRecursionDepthMode,
      topic.maxRecursionDepthOverride,
      assistant.maxRecursionDepth
    )
    const effectiveMaxReasoningSteps = resolveNumericOverride(
      topic.maxReasoningStepsMode,
      topic.maxReasoningStepsOverride,
      assistant.maxReasoningSteps
    )
    const effectiveStreamingEnabled =
      topic.streamingMode === 'override'
        ? (topic.streamingEnabledOverride ?? assistant.streamingEnabled)
        : assistant.streamingEnabled
    const dynamicPromptInjections = buildDynamicPromptInjections(payload.knowledgeRetrievalPolicy)

    const initialHistoryMessages = this.topicTranscriptProjector
      .project({
        topicId: payload.topicId,
        requestHeads: this.requestHeadsRepository.listByTopicId(payload.topicId),
        entries: this.requestEntriesRepository.listByTopicId(payload.topicId)
      })
      .messages.filter((message) => message.role === 'user' || message.parts.length > 0)
      .slice(-Math.max(0, effectiveContextMemoryRounds * 2))

    const executionSnapshot: NormalChatTaskExecutionSnapshot = {
      assistant: {
        id: assistant.id,
        name: assistant.name,
        emoji: assistant.emoji
      },
      topic: {
        id: topic.id,
        title: topic.title
      },
      conversation: {
        id: conversation.id,
        title: conversation.title,
        agentTemplateId: conversation.agentTemplateId
      },
      request: {
        input: payload.input,
        providerId: payload.providerId,
        modelId: payload.modelId
      },
      runtime: {
        systemPrompt: effectiveSystemPrompt,
        streamingEnabled: effectiveStreamingEnabled,
        contextMemoryRounds: effectiveContextMemoryRounds,
        maxRecursionDepth: effectiveMaxRecursionDepth,
        maxReasoningSteps: effectiveMaxReasoningSteps,
        persistencePreset: assistant.persistencePreset,
        promptBudgetChars: DEFAULT_PROMPT_BUDGET_CHARS,
        roundMemoryWindow: DEFAULT_ROUND_MEMORY_WINDOW,
        maxRepairAttempts: DEFAULT_MAX_REPAIR_ATTEMPTS,
        maxProviderRetries: DEFAULT_MAX_PROVIDER_RETRIES
      },
      historyMessages: initialHistoryMessages,
      promptInjections: [...conversation.programPromptInjections, ...dynamicPromptInjections],
      actions: resolveActionSnapshots(assistant, topic, payload.knowledgeRetrievalPolicy),
      createdAt: timestamp
    }

    const persistedExecutionSnapshot = createPersistedExecutionSnapshot(
      executionSnapshot,
      assistant.persistencePreset
    )

    const userMessage: NormalChatConversationMessage = {
      id: userMessageId,
      topicId: payload.topicId,
      requestId,
      role: 'user',
      parts: [{ kind: 'text', text: payload.input }],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    const rootAgentRun: NormalChatAgentRunRecord = {
      id: rootAgentRunId,
      taskId: requestId,
      parentAgentRunId: null,
      depth: 0,
      roleKind: 'director',
      templateId: 'main-agent-v1',
      goal: payload.input
    }

    const transaction = this.db.transaction(() => {
      this.requestHeadsRepository.create({
        requestId,
        assistantId: assistant.id,
        topicId: payload.topicId,
        conversationId: conversation.id,
        rootAgentRunId,
        userMessageId,
        assistantMessageId: null,
        status: 'queued',
        phase: 'queued',
        errorMessage: null,
        createdAt: timestamp,
        startedAt: null,
        finishedAt: null,
        updatedAt: timestamp,
        lastEntrySeq: null
      })
      const requestCreatedSeq = this.requestEntriesRepository.append({
        requestId,
        assistantId: assistant.id,
        topicId: payload.topicId,
        conversationId: conversation.id,
        entityKind: 'request',
        entityId: requestId,
        parentEntityId: null,
        op: 'created',
        visibility: 'internal',
        payloadJson: JSON.stringify({
          kind: 'request_created',
          assistant: persistedExecutionSnapshot.assistant,
          topic: persistedExecutionSnapshot.topic,
          conversation: persistedExecutionSnapshot.conversation,
          request: persistedExecutionSnapshot.request,
          runtime: persistedExecutionSnapshot.runtime,
          historyMessages: persistedExecutionSnapshot.historyMessages,
          promptInjections: persistedExecutionSnapshot.promptInjections,
          actions: persistedExecutionSnapshot.actions,
          createdAt: persistedExecutionSnapshot.createdAt,
          persistencePreset: assistant.persistencePreset
        }),
        createdAt: timestamp
      })
      const userMessageSeq = this.requestEntriesRepository.append({
        requestId,
        assistantId: assistant.id,
        topicId: payload.topicId,
        conversationId: conversation.id,
        entityKind: 'message',
        entityId: userMessageId,
        parentEntityId: requestId,
        op: 'created',
        visibility: 'transcript',
        payloadJson: JSON.stringify({
          kind: 'message_created',
          role: 'user',
          parts: userMessage.parts,
          createdAt: userMessage.createdAt,
          updatedAt: userMessage.updatedAt
        }),
        createdAt: timestamp
      })
      this.requestHeadsRepository.updateStatus({
        requestId,
        status: 'queued',
        phase: 'queued',
        updatedAt: timestamp,
        lastEntrySeq: Math.max(requestCreatedSeq, userMessageSeq)
      })
    })
    transaction()

    this.streamPublisher.setPersistencePreset(requestId, assistant.persistencePreset)
    this.streamPublisher.appendAgentRunCreated({
      requestId,
      agentRunId: rootAgentRunId,
      parentAgentRunId: null,
      depth: 0,
      roleKind: 'director',
      templateId: 'main-agent-v1',
      goal: payload.input,
      maxReactSteps: effectiveMaxReasoningSteps,
      maxChildDepth: effectiveMaxRecursionDepth,
      modelProviderId: payload.providerId,
      modelId: payload.modelId
    })

    const controller = new AbortController()
    this.taskScheduler.registerPendingTask(requestId, requestId, payload.topicId, controller)
    this.queueExecutor.enqueue({
      requestId,
      controller,
      execute: async () => {
        try {
          await this.agentRuntime.start({
            taskId: requestId,
            requestId,
            topicId: payload.topicId,
            executionSnapshot,
            rootAgentRun,
            signal: controller.signal
          })
        } catch (error) {
          if (!controller.signal.aborted) {
            this.taskScheduler.fail(
              requestId,
              error instanceof Error ? error.message : String(error)
            )
          }
          throw error
        } finally {
          this.taskScheduler.clearPendingTask(requestId)
        }
      }
    })

    return {
      requestId,
      message: userMessage
    }
  }

  async abort(requestId: string): Promise<void> {
    await this.taskScheduler.abort(requestId)
  }
}

function createPersistedExecutionSnapshot(
  executionSnapshot: NormalChatTaskExecutionSnapshot,
  persistencePreset: NormalChatAssistant['persistencePreset']
): NormalChatTaskExecutionSnapshot {
  if (persistencePreset === 'full') {
    return executionSnapshot
  }

  return {
    ...executionSnapshot,
    request: {
      ...executionSnapshot.request,
      input: ''
    },
    runtime: {
      ...executionSnapshot.runtime,
      systemPrompt: ''
    },
    historyMessages: [],
    promptInjections: [],
    actions: []
  }
}

function resolveNumericOverride(
  mode: 'inherit' | 'override',
  override: number | null,
  fallback: number
): number {
  return mode === 'override' ? (override ?? fallback) : fallback
}

function resolveActionSnapshots(
  assistant: {
    functionCallPubMedEnabled: boolean
    functionCallPubMedMode: 'fast' | 'slow'
    functionCallKnowledgeRetrievalEnabled: boolean
    functionCallKnowledgeRetrievalMode: 'fast' | 'slow'
    functionCallKgRetrievalEnabled: boolean
    functionCallKgRetrievalMode: 'fast' | 'slow'
  },
  topic: Pick<
    NormalChatTopic,
    | 'functionCallPubMedMode'
    | 'functionCallPubMedEnabledOverride'
    | 'functionCallPubMedExecutionMode'
    | 'functionCallPubMedExecutionModeOverride'
    | 'functionCallKnowledgeRetrievalMode'
    | 'functionCallKnowledgeRetrievalEnabledOverride'
    | 'functionCallKnowledgeRetrievalExecutionMode'
    | 'functionCallKnowledgeRetrievalExecutionModeOverride'
    | 'functionCallKgRetrievalMode'
    | 'functionCallKgRetrievalEnabledOverride'
    | 'functionCallKgRetrievalExecutionMode'
    | 'functionCallKgRetrievalExecutionModeOverride'
  >,
  knowledgeRetrievalPolicy?: NormalChatKnowledgeRetrievalPolicyInput | null
): NormalChatTaskExecutionActionSnapshot[] {
  const actions: NormalChatTaskExecutionActionSnapshot[] = [
    { actionKey: 'system.get_action_spec', kind: 'system', mode: 'fast' },
    { actionKey: 'system.dispatch_sub_agent', kind: 'system', mode: 'fast' }
  ]

  const pubmedEnabled =
    topic.functionCallPubMedMode === 'override'
      ? (topic.functionCallPubMedEnabledOverride ?? assistant.functionCallPubMedEnabled)
      : assistant.functionCallPubMedEnabled

  if (pubmedEnabled) {
    const pubmedMode =
      topic.functionCallPubMedExecutionMode === 'override'
        ? (topic.functionCallPubMedExecutionModeOverride ?? assistant.functionCallPubMedMode)
        : assistant.functionCallPubMedMode

    actions.push({
      actionKey: 'functioncall.pubmed_search',
      kind: 'functioncall',
      mode: pubmedMode
    })
  }

  const knowledgeRetrievalEnabled =
    topic.functionCallKnowledgeRetrievalMode === 'override'
      ? (topic.functionCallKnowledgeRetrievalEnabledOverride ??
        assistant.functionCallKnowledgeRetrievalEnabled)
      : assistant.functionCallKnowledgeRetrievalEnabled
  const knowledgeRetrievalAllowedByPolicy =
    knowledgeRetrievalPolicy === undefined
      ? true
      : hasUsableKnowledgeRetrievalPolicy(knowledgeRetrievalPolicy)

  if (knowledgeRetrievalEnabled && knowledgeRetrievalAllowedByPolicy) {
    const knowledgeRetrievalMode =
      topic.functionCallKnowledgeRetrievalExecutionMode === 'override'
        ? (topic.functionCallKnowledgeRetrievalExecutionModeOverride ??
          assistant.functionCallKnowledgeRetrievalMode)
        : assistant.functionCallKnowledgeRetrievalMode

    actions.push({
      actionKey: 'functioncall.knowledge_retrieval',
      kind: 'functioncall',
      mode: knowledgeRetrievalMode
    })
  }

  const kgRetrievalEnabled =
    topic.functionCallKgRetrievalMode === 'override'
      ? (topic.functionCallKgRetrievalEnabledOverride ?? assistant.functionCallKgRetrievalEnabled)
      : assistant.functionCallKgRetrievalEnabled

  if (kgRetrievalEnabled) {
    const kgRetrievalMode =
      topic.functionCallKgRetrievalExecutionMode === 'override'
        ? (topic.functionCallKgRetrievalExecutionModeOverride ??
          assistant.functionCallKgRetrievalMode)
        : assistant.functionCallKgRetrievalMode

    actions.push({
      actionKey: 'functioncall.kg_retrieval',
      kind: 'functioncall',
      mode: kgRetrievalMode
    })
  }

  return actions
}

function buildDynamicPromptInjections(
  knowledgeRetrievalPolicy?: NormalChatKnowledgeRetrievalPolicyInput | null
): string[] {
  const injections: string[] = []
  const knowledgeRetrievalPrompt = buildKnowledgeRetrievalPolicyPrompt(knowledgeRetrievalPolicy)
  if (knowledgeRetrievalPrompt) {
    injections.push(knowledgeRetrievalPrompt)
  }

  return injections
}
