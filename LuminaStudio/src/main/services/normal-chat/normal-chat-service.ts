import { randomUUID } from 'crypto'
import type {
  NormalChatBootstrap,
  NormalChatCallMode,
  NormalChatCostMode,
  NormalChatAssistant,
  NormalChatLabel,
  NormalChatTopic,
  NormalChatTopicPromptMode,
  NormalChatWorkspaceSnapshot,
  NormalChatConversationTurnDetail
} from '@preload/types'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import {
  getNormalChatAgentTemplateDefinition,
  listNormalChatAgentTemplates
} from './agent/registry'
import { NormalChatRepository } from './normal-chat.repository'

const log = logger.scope('NormalChatService')
const DEFAULT_TOPIC_TITLE = '默认话题'
const MIN_RECURSION_DEPTH = 0
const MAX_RECURSION_DEPTH = 6
const MIN_RETRIES_PER_AGENT = 0
const MAX_RETRIES_PER_AGENT = 4

export class NormalChatService {
  private readonly repository: NormalChatRepository

  constructor(databaseManager: DatabaseManager) {
    this.repository = new NormalChatRepository(databaseManager.getDatabase('userdata'))
  }

  async getBootstrap(): Promise<NormalChatBootstrap> {
    this.ensureWorkspaceReady()
    return {
      templates: listNormalChatAgentTemplates(),
      workspace: this.buildWorkspaceSnapshot()
    }
  }

  async createAssistant(templateKey: string): Promise<NormalChatWorkspaceSnapshot> {
    const template = getNormalChatAgentTemplateDefinition(templateKey)
    if (!template) {
      throw new Error(`Unknown assistant template: ${templateKey}`)
    }

    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const assistants = this.repository.listAssistants()
      const assistantId = randomUUID()
      const assistant: NormalChatAssistant = {
        id: assistantId,
        templateKey: template.key,
        name: this.buildNextAssistantName(
          assistants.map((item) => item.name),
          template.title
        ),
        emoji: template.emoji,
        labelId: null,
        defaultSystemPrompt: template.defaultSystemPrompt,
        saveFullConversationEnabled: false,
        callMode: 'auto',
        costMode: 'per_token',
        maxRecursionDepth: 2,
        maxRetriesPerAgent: 1,
        sortOrder: assistants.length
      }

      this.repository.insertAssistant(assistant)
      const topic = this.createDefaultTopicForAssistant(assistantId)
      this.repository.upsertWorkspaceState(assistantId, topic.id)
      log.info('Assistant created', { assistantId, templateKey })
      return this.buildWorkspaceSnapshot()
    })
  }

  async updateAssistant(params: {
    assistantId: string
    name?: string
    defaultSystemPrompt?: string
    saveFullConversationEnabled?: boolean
    callMode?: NormalChatCallMode
    costMode?: NormalChatCostMode
    maxRecursionDepth?: number
    maxRetriesPerAgent?: number
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const assistant = this.requireAssistant(params.assistantId)
      const nextName = params.name !== undefined ? params.name.trim() : assistant.name
      if (!nextName) {
        throw new Error('助手名称不能为空')
      }

      const nextPrompt =
        params.defaultSystemPrompt !== undefined
          ? params.defaultSystemPrompt
          : assistant.defaultSystemPrompt
      const nextSaveFullConversationEnabled =
        params.saveFullConversationEnabled !== undefined
          ? params.saveFullConversationEnabled
          : assistant.saveFullConversationEnabled
      const nextCallMode = params.callMode ?? assistant.callMode
      const nextCostMode = params.costMode ?? assistant.costMode
      const nextMaxRecursionDepth = this.normalizeMaxRecursionDepth(
        params.maxRecursionDepth ?? assistant.maxRecursionDepth
      )
      const nextMaxRetriesPerAgent = this.normalizeMaxRetriesPerAgent(
        params.maxRetriesPerAgent ?? assistant.maxRetriesPerAgent
      )

      this.repository.updateAssistant({
        ...assistant,
        name: nextName,
        defaultSystemPrompt: nextPrompt,
        saveFullConversationEnabled: nextSaveFullConversationEnabled,
        callMode: nextCallMode,
        costMode: nextCostMode,
        maxRecursionDepth: nextMaxRecursionDepth,
        maxRetriesPerAgent: nextMaxRetriesPerAgent
      })

      log.info('Assistant updated', { assistantId: params.assistantId })
      return this.buildWorkspaceSnapshot()
    })
  }

  async assignLabel(params: {
    assistantId: string
    labelId: string | null
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const assistant = this.requireAssistant(params.assistantId)
      if (params.labelId) {
        this.requireLabel(params.labelId)
      }

      this.repository.updateAssistant({
        ...assistant,
        labelId: params.labelId
      })

      return this.buildWorkspaceSnapshot()
    })
  }

  async createLabel(name: string): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const nextName = name.trim()
      if (!nextName) {
        throw new Error('标签名称不能为空')
      }

      this.assertLabelNameAvailable(nextName)

      const labels = this.repository.listLabels()
      this.repository.insertLabel({
        id: randomUUID(),
        name: nextName,
        sortOrder: labels.length
      })

      return this.buildWorkspaceSnapshot()
    })
  }

  async renameLabel(params: {
    labelId: string
    name: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const label = this.requireLabel(params.labelId)
      const nextName = params.name.trim()
      if (!nextName) {
        throw new Error('标签名称不能为空')
      }

      this.assertLabelNameAvailable(nextName, label.id)
      this.repository.updateLabel({
        ...label,
        name: nextName
      })

      return this.buildWorkspaceSnapshot()
    })
  }

  async deleteLabel(labelId: string): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      this.requireLabel(labelId)
      this.repository.deleteLabel(labelId)
      return this.buildWorkspaceSnapshot()
    })
  }

  async setActiveAssistant(assistantId: string): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      this.requireAssistant(assistantId)
      const topics = this.ensureAssistantHasTopics(assistantId)
      this.repository.upsertWorkspaceState(assistantId, topics[0].id)
      return this.buildWorkspaceSnapshot()
    })
  }

  async createTopic(assistantId: string): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      this.requireAssistant(assistantId)
      const topics = this.repository.listTopicsByAssistantId(assistantId)
      const topic = this.createTopicRecord(assistantId, topics)
      this.repository.insertTopic(topic)
      this.repository.upsertWorkspaceState(assistantId, topic.id)
      log.info('Topic created', { assistantId, topicId: topic.id })
      return this.buildWorkspaceSnapshot()
    })
  }

  async renameTopic(params: {
    assistantId: string
    topicId: string
    title: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const topic = this.requireTopic(params.topicId, params.assistantId)
      const nextTitle = params.title.trim()
      if (!nextTitle) {
        throw new Error('话题名称不能为空')
      }

      this.repository.updateTopic({
        ...topic,
        title: nextTitle
      })
      return this.buildWorkspaceSnapshot()
    })
  }

  async deleteTopic(params: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const topic = this.requireTopic(params.topicId, params.assistantId)
      const workspaceState = this.repository.getWorkspaceState()

      this.repository.deleteTopic(topic.id)

      let topics = this.repository.listTopicsByAssistantId(params.assistantId)
      if (topics.length === 0) {
        const fallbackTopic = this.createDefaultTopicForAssistant(params.assistantId)
        topics = [fallbackTopic]
      }

      const nextActiveAssistantId =
        workspaceState?.active_assistant_id === params.assistantId
          ? params.assistantId
          : (workspaceState?.active_assistant_id ?? params.assistantId)

      const nextActiveTopicId =
        workspaceState?.active_topic_id === topic.id && nextActiveAssistantId === params.assistantId
          ? topics[0].id
          : workspaceState?.active_topic_id === topic.id
            ? topics[0].id
            : (workspaceState?.active_topic_id ?? topics[0].id)

      this.repository.upsertWorkspaceState(nextActiveAssistantId, nextActiveTopicId)
      log.info('Topic deleted', { assistantId: params.assistantId, topicId: params.topicId })
      return this.buildWorkspaceSnapshot()
    })
  }

  async setActiveTopic(params: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      this.requireTopic(params.topicId, params.assistantId)
      this.repository.upsertWorkspaceState(params.assistantId, params.topicId)
      return this.buildWorkspaceSnapshot()
    })
  }

  async updateTopicPrompt(params: {
    assistantId: string
    topicId: string
    mode: NormalChatTopicPromptMode
    promptOverride?: string | null
  }): Promise<NormalChatWorkspaceSnapshot> {
    return this.repository.runInTransaction(() => {
      this.ensureWorkspaceReady()
      const topic = this.requireTopic(params.topicId, params.assistantId)
      const promptOverride = params.mode === 'override' ? (params.promptOverride ?? '') : null

      this.repository.updateTopic({
        ...topic,
        systemPromptMode: params.mode,
        systemPromptOverride: promptOverride
      })

      this.repository.upsertWorkspaceState(params.assistantId, params.topicId)
      return this.buildWorkspaceSnapshot()
    })
  }

  async getConversationTurnDetail(
    requestId: string
  ): Promise<NormalChatConversationTurnDetail | null> {
    return this.repository.getConversationTurnTrace(requestId)
  }

  async deleteConversationTurn(requestId: string): Promise<void> {
    this.repository.deleteConversationTurn(requestId)
  }

  private ensureWorkspaceReady(): void {
    const assistants = this.repository.listAssistants()

    if (assistants.length === 0) {
      this.seedDefaultWorkspace()
      return
    }

    this.repository.runInTransaction(() => {
      const nextAssistants = this.repository.listAssistants()
      nextAssistants.forEach((assistant) => {
        this.ensureAssistantHasTopics(assistant.id)
      })

      const repairedAssistants = this.repository.listAssistants()
      const workspaceState = this.repository.getWorkspaceState()
      const activeAssistantId = this.resolveActiveAssistantId(
        repairedAssistants.map((assistant) => assistant.id),
        workspaceState?.active_assistant_id
      )
      const topics = this.ensureAssistantHasTopics(activeAssistantId)
      const activeTopicId = this.resolveActiveTopicId(
        topics.map((topic) => topic.id),
        workspaceState?.active_topic_id
      )

      this.repository.upsertWorkspaceState(activeAssistantId, activeTopicId)
    })
  }

  private seedDefaultWorkspace(): void {
    const template = getNormalChatAgentTemplateDefinition('base-agent')
    if (!template) {
      throw new Error('base-agent template is required for Normal Chat bootstrap')
    }

    this.repository.runInTransaction(() => {
      const assistantId = randomUUID()
      this.repository.insertAssistant({
        id: assistantId,
        templateKey: template.key,
        name: template.title,
        emoji: template.emoji,
        labelId: null,
        defaultSystemPrompt: template.defaultSystemPrompt,
        saveFullConversationEnabled: false,
        callMode: 'auto' as NormalChatCallMode,
        costMode: 'per_token' as NormalChatCostMode,
        maxRecursionDepth: 2,
        maxRetriesPerAgent: 1,
        sortOrder: 0
      })

      const topic = this.createDefaultTopicForAssistant(assistantId)
      this.repository.upsertWorkspaceState(assistantId, topic.id)
      log.info('Normal Chat workspace bootstrapped', { assistantId, topicId: topic.id })
    })
  }

  private buildWorkspaceSnapshot(): NormalChatWorkspaceSnapshot {
    const labels = this.repository.listLabels()
    const assistants = this.repository.listAssistants()
    const topics = this.repository.listAllTopics()
    const workspaceState = this.repository.getWorkspaceState()
    const topicsByAssistantId: Record<string, NormalChatTopic[]> = {}

    assistants.forEach((assistant) => {
      topicsByAssistantId[assistant.id] = topics.filter(
        (topic) => topic.assistantId === assistant.id
      )
    })

    const activeAssistantId = this.resolveActiveAssistantId(
      assistants.map((assistant) => assistant.id),
      workspaceState?.active_assistant_id
    )
    const activeTopicId = this.resolveActiveTopicId(
      topicsByAssistantId[activeAssistantId]?.map((topic) => topic.id) ?? [],
      workspaceState?.active_topic_id
    )

    return {
      labels,
      assistants,
      topicsByAssistantId,
      activeAssistantId,
      activeTopicId
    }
  }

  private ensureAssistantHasTopics(assistantId: string): NormalChatTopic[] {
    const topics = this.repository.listTopicsByAssistantId(assistantId)
    if (topics.length > 0) {
      return topics
    }

    const fallbackTopic = this.createDefaultTopicForAssistant(assistantId)
    return [fallbackTopic]
  }

  private createDefaultTopicForAssistant(assistantId: string): NormalChatTopic {
    const topics = this.repository.listTopicsByAssistantId(assistantId)
    const topic = this.createTopicRecord(assistantId, topics)
    this.repository.insertTopic(topic)
    return topic
  }

  private createTopicRecord(assistantId: string, topics: NormalChatTopic[]): NormalChatTopic {
    return {
      id: randomUUID(),
      assistantId,
      title: this.buildNextTopicTitle(topics.map((topic) => topic.title)),
      systemPromptMode: 'inherit',
      systemPromptOverride: null,
      sortOrder: topics.length
    }
  }

  private requireAssistant(assistantId: string) {
    const assistant = this.repository.getAssistantById(assistantId)
    if (!assistant) {
      throw new Error(`助手不存在: ${assistantId}`)
    }
    return assistant
  }

  private requireLabel(labelId: string): NormalChatLabel {
    const label = this.repository.getLabelById(labelId)
    if (!label) {
      throw new Error(`标签不存在: ${labelId}`)
    }
    return label
  }

  private requireTopic(topicId: string, assistantId: string) {
    const topic = this.repository.getTopicById(topicId)
    if (!topic || topic.assistantId !== assistantId) {
      throw new Error(`话题不存在: ${topicId}`)
    }
    return topic
  }

  private resolveActiveAssistantId(assistantIds: string[], preferredAssistantId?: string): string {
    if (assistantIds.length === 0) {
      throw new Error('Normal Chat assistant list is empty')
    }

    return assistantIds.includes(preferredAssistantId ?? '')
      ? (preferredAssistantId as string)
      : assistantIds[0]
  }

  private resolveActiveTopicId(topicIds: string[], preferredTopicId?: string): string {
    if (topicIds.length === 0) {
      throw new Error('Normal Chat topic list is empty')
    }

    return topicIds.includes(preferredTopicId ?? '') ? (preferredTopicId as string) : topicIds[0]
  }

  private buildNextAssistantName(existingNames: string[], baseTitle: string): string {
    return this.buildNextAutoName(existingNames, baseTitle)
  }

  private buildNextTopicTitle(existingTitles: string[]): string {
    return this.buildNextAutoName(existingTitles, DEFAULT_TOPIC_TITLE)
  }

  private assertLabelNameAvailable(nextName: string, currentLabelId?: string): void {
    const duplicatedLabel = this.repository
      .listLabels()
      .find(
        (label) =>
          label.id !== currentLabelId &&
          label.name.localeCompare(nextName, 'zh-CN', { sensitivity: 'accent' }) === 0
      )

    if (duplicatedLabel) {
      throw new Error(`标签名称已存在: ${nextName}`)
    }
  }

  private buildNextAutoName(existingNames: string[], baseName: string): string {
    const usedIndexes = new Set<number>()

    existingNames.forEach((name) => {
      if (name === baseName) {
        usedIndexes.add(1)
        return
      }

      const match = name.match(new RegExp(`^${this.escapeForRegExp(baseName)}\\s+(\\d+)$`))
      if (!match) {
        return
      }

      usedIndexes.add(Number(match[1]))
    })

    let nextIndex = 1
    while (usedIndexes.has(nextIndex)) {
      nextIndex += 1
    }

    return nextIndex === 1 ? baseName : `${baseName} ${nextIndex}`
  }

  private escapeForRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private normalizeMaxRecursionDepth(value: number): number {
    return Math.min(MAX_RECURSION_DEPTH, Math.max(MIN_RECURSION_DEPTH, Math.floor(value)))
  }

  private normalizeMaxRetriesPerAgent(value: number): number {
    return Math.min(MAX_RETRIES_PER_AGENT, Math.max(MIN_RETRIES_PER_AGENT, Math.floor(value)))
  }
}
