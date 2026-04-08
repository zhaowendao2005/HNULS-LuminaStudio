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
import { NormalChatTaskScheduler } from '../runtime/scheduler/task-scheduler'

// workspace 只处理“配置面”和“当前选中态”：assistant / label / topic / active state。
// 运行中的任务、流式事件、消息追踪都不应该落在这一层。
export class NormalChatWorkspaceService {
  constructor(
    private readonly db: Database.Database,
    private readonly labelsRepository: NormalChatLabelsRepository,
    private readonly assistantsRepository: NormalChatAssistantsRepository,
    private readonly assistantActionPoliciesRepository: NormalChatAssistantActionPoliciesRepository,
    private readonly topicsRepository: NormalChatTopicsRepository,
    private readonly workspaceStateRepository: NormalChatWorkspaceStateRepository,
    private readonly taskScheduler: NormalChatTaskScheduler
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
    persistencePreset?: NormalChatAssistant['persistencePreset']
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
      mcpEnabled: payload.mcpEnabled ?? current.mcpEnabled,
      persistencePreset: payload.persistencePreset ?? current.persistencePreset
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

  /**
   * 删除单个 topic。
   *
   * 这里先按 topic 作用域中断所有在途 request，再进入事务删除，避免后台 runtime
   * 在 topic 已经被级联删掉之后还继续写 task / event / model call。
   *
   * 另外要特别注意：只有删除的是当前 active assistant 下的 active topic 时，
   * 才允许改写 workspace_state；删除“非当前助手”的 topic 不能污染当前选中态。
   */
  async deleteTopic(assistantId: string, topicId: string): Promise<NormalChatWorkspaceSnapshot> {
    const topics = this.topicsRepository.listByAssistant(assistantId)
    const remaining = topics.filter((topic) => topic.id !== topicId)
    const workspaceState = this.workspaceStateRepository.get()
    const isActiveAssistant = workspaceState?.active_assistant_id === assistantId
    const isActiveTopic = isActiveAssistant && workspaceState?.active_topic_id === topicId

    await this.taskScheduler.abortByTopicIds([topicId])

    const timestamp = nowIso()
    const transaction = this.db.transaction(() => {
      this.topicsRepository.delete(assistantId, topicId)

      if (!isActiveAssistant) {
        return
      }

      if (remaining.length === 0) {
        const fallbackTopic = createDefaultTopic(assistantId, 0)
        const fallbackConversationId = randomUUID()
        this.topicsRepository.save(fallbackTopic, timestamp)
        this.db
          .prepare(
            `INSERT INTO normal_chat_conversations
             (id, topic_id, title, agent_template_id, program_prompt_injections_json, created_at, updated_at)
             VALUES (?, ?, ?, 'main-agent-v1', '[]', ?, ?)`
          )
          .run(
            fallbackConversationId,
            fallbackTopic.id,
            `Conversation · ${fallbackTopic.title}`,
            timestamp,
            timestamp
          )
        this.workspaceStateRepository.set(assistantId, fallbackTopic.id, timestamp)
        return
      }

      if (isActiveTopic) {
        this.workspaceStateRepository.set(assistantId, remaining[0]?.id ?? '', timestamp)
      }
    })
    transaction()

    return this.loadWorkspaceSnapshot()
  }

  /**
   * 删除 assistant 及其作用域。
   *
   * 语义是删除“配置根节点”，不是只删一行 assistant：
   * - 该助手下全部 topic / conversation 会被级联删除
   * - 对应会话、消息、调试记录也会一起消失
   * - 删除前必须先中断该助手作用域内的所有在途 request
   *
   * 如果删的是最后一个 assistant，会立即补一个新的默认 assistant + 默认 topic，
   * 保证 workspace 永远不会落到“完全空”的不可用状态。
   */
  async deleteAssistant(assistantId: string): Promise<NormalChatWorkspaceSnapshot> {
    const assistants = this.assistantsRepository.list()
    const remainingAssistants = assistants.filter((assistant) => assistant.id !== assistantId)
    const topicIds = this.topicsRepository.listByAssistant(assistantId).map((topic) => topic.id)
    const workspaceState = this.workspaceStateRepository.get()
    const isActiveAssistant = workspaceState?.active_assistant_id === assistantId

    await this.taskScheduler.abortByTopicIds(topicIds)

    const timestamp = nowIso()
    const transaction = this.db.transaction(() => {
      this.assistantsRepository.delete(assistantId)

      if (remainingAssistants.length === 0) {
        const fallbackAssistant = createDefaultAssistant(0)
        const fallbackTopic = createDefaultTopic(fallbackAssistant.id, 0)
        const fallbackConversationId = randomUUID()
        this.assistantsRepository.save(fallbackAssistant, timestamp)
        this.assistantActionPoliciesRepository.seedDefaultPolicies(fallbackAssistant.id, timestamp)
        this.topicsRepository.save(fallbackTopic, timestamp)
        this.db
          .prepare(
            `INSERT INTO normal_chat_conversations
             (id, topic_id, title, agent_template_id, program_prompt_injections_json, created_at, updated_at)
             VALUES (?, ?, ?, 'main-agent-v1', '[]', ?, ?)`
          )
          .run(
            fallbackConversationId,
            fallbackTopic.id,
            `Conversation · ${fallbackTopic.title}`,
            timestamp,
            timestamp
          )
        this.workspaceStateRepository.set(fallbackAssistant.id, fallbackTopic.id, timestamp)
        return
      }

      if (!isActiveAssistant) {
        return
      }

      const nextAssistant = remainingAssistants[0] ?? null
      const nextTopicId = nextAssistant
        ? (this.topicsRepository.getFirstTopicIdByAssistant(nextAssistant.id) ?? '')
        : ''
      if (nextAssistant) {
        this.workspaceStateRepository.set(nextAssistant.id, nextTopicId, timestamp)
      }
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
