import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  NormalChatAssistant,
  NormalChatBootstrap,
  NormalChatFunctionCallMode,
  NormalChatTopic,
  NormalChatWorkspaceSnapshot
} from '@preload/types'
import { createDefaultAssistant, createDefaultTopic } from '../shared/defaults'
import { nowIso } from '../shared/utils'
import { NormalChatAssistantActionPoliciesRepository } from '../repositories/assistant-action-policies.repository'
import { NormalChatAssistantsRepository } from '../repositories/assistants.repository'
import { NormalChatLabelsRepository } from '../repositories/labels.repository'
import { NormalChatTopicsRepository } from '../repositories/topics.repository'
import { NormalChatWorkspaceStateRepository } from '../repositories/workspace-state.repository'

// workspace 只处理“配置面”和“当前选中态”：assistant / label / topic / active state。
// 运行中的任务、流式事件、消息追踪都不应该落在这一层。
export class NormalChatWorkspaceService {
  constructor(
    private readonly db: Database.Database,
    private readonly labelsRepository: NormalChatLabelsRepository,
    private readonly assistantsRepository: NormalChatAssistantsRepository,
    private readonly assistantActionPoliciesRepository: NormalChatAssistantActionPoliciesRepository,
    private readonly topicsRepository: NormalChatTopicsRepository,
    private readonly workspaceStateRepository: NormalChatWorkspaceStateRepository
  ) {}

  ensureSeedData(): void {
    // 启动兜底：保证最少存在一个 assistant、一个 topic 和一份当前工作区状态。
    const assistantCount = this.assistantsRepository.count()

    if (assistantCount > 0) {
      const workspaceState = this.workspaceStateRepository.get()
      if (!workspaceState) {
        const assistantId = this.assistantsRepository.getFirstAssistantId()
        if (!assistantId) {
          return
        }
        const topicId = this.topicsRepository.getFirstTopicIdByAssistant(assistantId) ?? ''
        this.workspaceStateRepository.set(assistantId, topicId, nowIso())
      }
      return
    }

    const assistant = createDefaultAssistant(0)
    const topic = createDefaultTopic(assistant.id, 0)
    const timestamp = nowIso()

    const transaction = this.db.transaction(() => {
      this.assistantsRepository.save(assistant, timestamp)
      this.assistantActionPoliciesRepository.seedDefaultPolicies(assistant.id, timestamp)
      this.topicsRepository.save(topic, timestamp)
      this.workspaceStateRepository.set(assistant.id, topic.id, timestamp)
    })
    transaction()
  }

  getBootstrap(): NormalChatBootstrap {
    this.ensureSeedData()
    return {
      workspace: this.loadWorkspaceSnapshot()
    }
  }

  getWorkspaceSnapshot(): NormalChatWorkspaceSnapshot {
    this.ensureSeedData()
    return this.loadWorkspaceSnapshot()
  }

  getAssistantById(assistantId: string): NormalChatAssistant {
    const assistant = this.assistantsRepository.getById(assistantId)
    if (!assistant) {
      throw new Error(`Assistant not found: ${assistantId}`)
    }
    return assistant
  }

  getTopicById(assistantId: string | undefined, topicId: string): NormalChatTopic {
    const topic = assistantId
      ? this.topicsRepository.getByAssistantAndId(assistantId, topicId)
      : this.topicsRepository.getById(topicId)

    if (!topic) {
      throw new Error(`Topic not found: ${topicId}`)
    }

    return topic
  }

  createAssistant(): NormalChatWorkspaceSnapshot {
    const snapshot = this.loadWorkspaceSnapshot()
    const assistant = createDefaultAssistant(snapshot.assistants.length)
    const topic = createDefaultTopic(assistant.id, 0)
    const timestamp = nowIso()

    const transaction = this.db.transaction(() => {
      this.assistantsRepository.save(assistant, timestamp)
      this.assistantActionPoliciesRepository.seedDefaultPolicies(assistant.id, timestamp)
      this.topicsRepository.save(topic, timestamp)
      this.workspaceStateRepository.set(assistant.id, topic.id, timestamp)
    })
    transaction()

    return this.loadWorkspaceSnapshot()
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
    functionCallPubMedMode?: NormalChatFunctionCallMode
    mcpEnabled?: boolean
  }): NormalChatWorkspaceSnapshot {
    const current = this.getAssistantById(payload.assistantId)
    const next: NormalChatAssistant = {
      ...current,
      name: payload.name ?? current.name,
      defaultSystemPrompt: payload.defaultSystemPrompt ?? current.defaultSystemPrompt,
      streamingEnabled: payload.streamingEnabled ?? current.streamingEnabled,
      callMode: payload.callMode ?? current.callMode,
      costMode: payload.costMode ?? current.costMode,
      defaultModelProviderId: payload.defaultModelProviderId ?? current.defaultModelProviderId,
      defaultModelId: payload.defaultModelId ?? current.defaultModelId,
      contextMemoryRounds: payload.contextMemoryRounds ?? current.contextMemoryRounds,
      maxRecursionDepth: payload.maxRecursionDepth ?? current.maxRecursionDepth,
      maxReasoningSteps: payload.maxReasoningSteps ?? current.maxReasoningSteps,
      systemActionFunctionCallEnabled:
        payload.systemActionFunctionCallEnabled ?? current.systemActionFunctionCallEnabled,
      systemActionSubAgentEnabled:
        payload.systemActionSubAgentEnabled ?? current.systemActionSubAgentEnabled,
      functionCallPubMedEnabled:
        payload.functionCallPubMedEnabled ?? current.functionCallPubMedEnabled,
      functionCallPubMedMode: payload.functionCallPubMedMode ?? current.functionCallPubMedMode,
      mcpEnabled: payload.mcpEnabled ?? current.mcpEnabled
    }

    this.assistantsRepository.save(next, nowIso(), true)
    return this.loadWorkspaceSnapshot()
  }

  assignLabel(assistantId: string, labelId: string | null): NormalChatWorkspaceSnapshot {
    this.assistantsRepository.assignLabel(assistantId, labelId, nowIso())
    return this.loadWorkspaceSnapshot()
  }

  createLabel(name: string): NormalChatWorkspaceSnapshot {
    const timestamp = nowIso()
    this.labelsRepository.create(randomUUID(), name, this.labelsRepository.count(), timestamp)
    return this.loadWorkspaceSnapshot()
  }

  renameLabel(labelId: string, name: string): NormalChatWorkspaceSnapshot {
    this.labelsRepository.rename(labelId, name, nowIso())
    return this.loadWorkspaceSnapshot()
  }

  deleteLabel(labelId: string): NormalChatWorkspaceSnapshot {
    const timestamp = nowIso()
    const transaction = this.db.transaction(() => {
      this.assistantsRepository.clearLabelAssignments(labelId, timestamp)
      this.labelsRepository.delete(labelId)
    })
    transaction()
    return this.loadWorkspaceSnapshot()
  }

  setActiveAssistant(assistantId: string): NormalChatWorkspaceSnapshot {
    const topicId = this.topicsRepository.getFirstTopicIdByAssistant(assistantId) ?? ''
    this.workspaceStateRepository.set(assistantId, topicId, nowIso())
    return this.loadWorkspaceSnapshot()
  }

  createTopic(assistantId: string): NormalChatWorkspaceSnapshot {
    const topic = createDefaultTopic(
      assistantId,
      this.topicsRepository.countByAssistant(assistantId)
    )
    const timestamp = nowIso()
    this.topicsRepository.save(topic, timestamp)
    this.workspaceStateRepository.set(assistantId, topic.id, timestamp)
    return this.loadWorkspaceSnapshot()
  }

  renameTopic(assistantId: string, topicId: string, title: string): NormalChatWorkspaceSnapshot {
    this.topicsRepository.rename(assistantId, topicId, title, nowIso())
    return this.loadWorkspaceSnapshot()
  }

  deleteTopic(assistantId: string, topicId: string): NormalChatWorkspaceSnapshot {
    const timestamp = nowIso()
    const remaining = this.topicsRepository
      .listByAssistant(assistantId)
      .filter((topic) => topic.id !== topicId)

    const transaction = this.db.transaction(() => {
      this.topicsRepository.delete(assistantId, topicId)

      if (remaining.length === 0) {
        const fallbackTopic = createDefaultTopic(assistantId, 0)
        this.topicsRepository.save(fallbackTopic, timestamp)
        this.workspaceStateRepository.set(assistantId, fallbackTopic.id, timestamp)
        return
      }

      const workspaceState = this.workspaceStateRepository.get()
      const nextTopicId =
        workspaceState?.active_topic_id === topicId
          ? (remaining[0]?.id ?? '')
          : (workspaceState?.active_topic_id ?? remaining[0]?.id ?? '')

      this.workspaceStateRepository.set(assistantId, nextTopicId, timestamp)
    })
    transaction()

    return this.loadWorkspaceSnapshot()
  }

  setActiveTopic(assistantId: string, topicId: string): NormalChatWorkspaceSnapshot {
    this.workspaceStateRepository.set(assistantId, topicId, nowIso())
    return this.loadWorkspaceSnapshot()
  }

  updateTopicPrompt(payload: {
    assistantId: string
    topicId: string
    mode: NormalChatTopic['systemPromptMode']
    promptOverride?: string | null
  }): NormalChatWorkspaceSnapshot {
    return this.updateTopicConfig({
      assistantId: payload.assistantId,
      topicId: payload.topicId,
      systemPromptMode: payload.mode,
      systemPromptOverride: payload.promptOverride ?? null
    })
  }

  updateTopicStreaming(payload: {
    assistantId: string
    topicId: string
    mode: NormalChatTopic['streamingMode']
    streamingEnabledOverride?: boolean | null
  }): NormalChatWorkspaceSnapshot {
    return this.updateTopicConfig({
      assistantId: payload.assistantId,
      topicId: payload.topicId,
      streamingMode: payload.mode,
      streamingEnabledOverride: payload.streamingEnabledOverride ?? null
    })
  }

  updateTopicConfig(
    payload: Partial<NormalChatTopic> & { assistantId: string; topicId: string }
  ): NormalChatWorkspaceSnapshot {
    // topic 级配置允许按字段覆盖 assistant 默认值；mode !== override 时强制回落为 null。
    const current = this.getTopicById(payload.assistantId, payload.topicId)
    const next: NormalChatTopic = {
      ...current,
      systemPromptMode: payload.systemPromptMode ?? current.systemPromptMode,
      systemPromptOverride:
        (payload.systemPromptMode ?? current.systemPromptMode) === 'override'
          ? (payload.systemPromptOverride ?? current.systemPromptOverride ?? '')
          : null,
      streamingMode: payload.streamingMode ?? current.streamingMode,
      streamingEnabledOverride:
        (payload.streamingMode ?? current.streamingMode) === 'override'
          ? (payload.streamingEnabledOverride ?? current.streamingEnabledOverride ?? true)
          : null,
      costMode: payload.costMode ?? current.costMode,
      costModeOverride:
        (payload.costMode ?? current.costMode) === 'override'
          ? (payload.costModeOverride ?? current.costModeOverride ?? 'per_token')
          : null,
      modelMode: payload.modelMode ?? current.modelMode,
      modelProviderIdOverride:
        (payload.modelMode ?? current.modelMode) === 'override'
          ? (payload.modelProviderIdOverride ?? current.modelProviderIdOverride ?? null)
          : null,
      modelIdOverride:
        (payload.modelMode ?? current.modelMode) === 'override'
          ? (payload.modelIdOverride ?? current.modelIdOverride ?? null)
          : null,
      contextMemoryRoundsMode: payload.contextMemoryRoundsMode ?? current.contextMemoryRoundsMode,
      contextMemoryRoundsOverride:
        (payload.contextMemoryRoundsMode ?? current.contextMemoryRoundsMode) === 'override'
          ? (payload.contextMemoryRoundsOverride ?? current.contextMemoryRoundsOverride ?? 12)
          : null,
      maxRecursionDepthMode: payload.maxRecursionDepthMode ?? current.maxRecursionDepthMode,
      maxRecursionDepthOverride:
        (payload.maxRecursionDepthMode ?? current.maxRecursionDepthMode) === 'override'
          ? (payload.maxRecursionDepthOverride ?? current.maxRecursionDepthOverride ?? 2)
          : null,
      maxReasoningStepsMode: payload.maxReasoningStepsMode ?? current.maxReasoningStepsMode,
      maxReasoningStepsOverride:
        (payload.maxReasoningStepsMode ?? current.maxReasoningStepsMode) === 'override'
          ? (payload.maxReasoningStepsOverride ?? current.maxReasoningStepsOverride ?? 6)
          : null,
      systemActionFunctionCallMode:
        payload.systemActionFunctionCallMode ?? current.systemActionFunctionCallMode,
      systemActionFunctionCallEnabledOverride:
        (payload.systemActionFunctionCallMode ?? current.systemActionFunctionCallMode) ===
        'override'
          ? (payload.systemActionFunctionCallEnabledOverride ??
            current.systemActionFunctionCallEnabledOverride ??
            true)
          : null,
      systemActionSubAgentMode:
        payload.systemActionSubAgentMode ?? current.systemActionSubAgentMode,
      systemActionSubAgentEnabledOverride:
        (payload.systemActionSubAgentMode ?? current.systemActionSubAgentMode) === 'override'
          ? (payload.systemActionSubAgentEnabledOverride ??
            current.systemActionSubAgentEnabledOverride ??
            true)
          : null,
      functionCallPubMedMode: payload.functionCallPubMedMode ?? current.functionCallPubMedMode,
      functionCallPubMedEnabledOverride:
        (payload.functionCallPubMedMode ?? current.functionCallPubMedMode) === 'override'
          ? (payload.functionCallPubMedEnabledOverride ??
            current.functionCallPubMedEnabledOverride ??
            true)
          : null,
      functionCallPubMedExecutionMode:
        payload.functionCallPubMedExecutionMode ?? current.functionCallPubMedExecutionMode,
      functionCallPubMedExecutionModeOverride:
        (payload.functionCallPubMedExecutionMode ?? current.functionCallPubMedExecutionMode) ===
        'override'
          ? (payload.functionCallPubMedExecutionModeOverride ??
            current.functionCallPubMedExecutionModeOverride ??
            'fast')
          : null,
      mcpMode: payload.mcpMode ?? current.mcpMode,
      mcpEnabledOverride:
        (payload.mcpMode ?? current.mcpMode) === 'override'
          ? (payload.mcpEnabledOverride ?? current.mcpEnabledOverride ?? false)
          : null
    }

    this.topicsRepository.save(next, nowIso(), true)
    return this.loadWorkspaceSnapshot()
  }

  private loadWorkspaceSnapshot(): NormalChatWorkspaceSnapshot {
    // renderer 需要的仍是一份聚合快照，因此这里统一把 labels / assistants / topics / active state 拼好。
    const labels = this.labelsRepository.list()
    const assistants = this.assistantsRepository.list()
    const topicsByAssistantId = this.topicsRepository
      .listAll()
      .reduce<Record<string, NormalChatTopic[]>>((acc, topic) => {
        acc[topic.assistantId] ??= []
        acc[topic.assistantId].push(topic)
        return acc
      }, {})

    const workspaceState = this.workspaceStateRepository.get()
    const activeAssistantId = workspaceState?.active_assistant_id ?? assistants[0]?.id ?? ''
    const activeTopics = topicsByAssistantId[activeAssistantId] ?? []
    const activeTopicId =
      activeTopics.find((topic) => topic.id === workspaceState?.active_topic_id)?.id ??
      activeTopics[0]?.id ??
      ''

    return {
      labels,
      assistants,
      topicsByAssistantId,
      activeAssistantId,
      activeTopicId
    }
  }
}
