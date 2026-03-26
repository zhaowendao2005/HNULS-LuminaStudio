import type {
  NormalChatAssistant,
  NormalChatBootstrap,
  NormalChatLabel,
  NormalChatTopic,
  NormalChatWorkspaceSnapshot
} from '@preload/types'

function createDefaultAssistant(): NormalChatAssistant {
  return {
    id: 'assistant-default',
    name: '默认助手',
    emoji: '🤖',
    labelId: null,
    defaultSystemPrompt: '你是一个临时 mock 助手，负责维持 Normal Chat 页面交互。',
    saveFullConversationEnabled: false,
    streamingEnabled: true,
    callMode: 'auto',
    costMode: 'per_token',
    maxRecursionDepth: 2,
    maxRetriesPerAgent: 1,
    sortOrder: 0
  }
}

function createDefaultTopic(assistantId: string): NormalChatTopic {
  return {
    id: 'topic-default',
    assistantId,
    title: '默认话题',
    systemPromptMode: 'inherit',
    systemPromptOverride: null,
    streamingMode: 'inherit',
    streamingEnabledOverride: null,
    sortOrder: 0
  }
}

function createDefaultSnapshot(): NormalChatWorkspaceSnapshot {
  const assistant = createDefaultAssistant()
  const topic = createDefaultTopic(assistant.id)

  return {
    labels: [],
    assistants: [assistant],
    topicsByAssistantId: {
      [assistant.id]: [topic]
    },
    activeAssistantId: assistant.id,
    activeTopicId: topic.id
  }
}

let labelCounter = 1
let assistantCounter = 1
let topicCounter = 1
let workspaceSnapshot: NormalChatWorkspaceSnapshot = createDefaultSnapshot()

function cloneSnapshot(): NormalChatWorkspaceSnapshot {
  return structuredClone(workspaceSnapshot)
}

function normalizeSnapshot(snapshot: NormalChatWorkspaceSnapshot): void {
  if (!snapshot.assistants.length) {
    workspaceSnapshot = createDefaultSnapshot()
    return
  }

  const activeAssistant =
    snapshot.assistants.find((assistant) => assistant.id === snapshot.activeAssistantId) ??
    snapshot.assistants[0]
  const activeTopics = snapshot.topicsByAssistantId[activeAssistant.id] ?? []
  const activeTopic =
    activeTopics.find((topic) => topic.id === snapshot.activeTopicId) ?? activeTopics[0] ?? null

  workspaceSnapshot = {
    ...snapshot,
    activeAssistantId: activeAssistant.id,
    activeTopicId: activeTopic?.id ?? ''
  }
}

function updateAssistantSnapshot(
  assistantId: string,
  updater: (assistant: NormalChatAssistant) => NormalChatAssistant
): void {
  const nextAssistants = workspaceSnapshot.assistants.map((assistant) =>
    assistant.id === assistantId ? updater(assistant) : assistant
  )
  normalizeSnapshot({
    ...workspaceSnapshot,
    assistants: nextAssistants
  })
}

function updateTopicSnapshot(
  assistantId: string,
  topicId: string,
  updater: (topic: NormalChatTopic) => NormalChatTopic
): void {
  const topics = workspaceSnapshot.topicsByAssistantId[assistantId] ?? []
  const nextTopics = topics.map((topic) => (topic.id === topicId ? updater(topic) : topic))

  normalizeSnapshot({
    ...workspaceSnapshot,
    topicsByAssistantId: {
      ...workspaceSnapshot.topicsByAssistantId,
      [assistantId]: nextTopics
    }
  })
}

export function getNormalChatWorkspaceMockSnapshot(): NormalChatWorkspaceSnapshot {
  return cloneSnapshot()
}

export function resetNormalChatWorkspaceMockState(): void {
  labelCounter = 1
  assistantCounter = 1
  topicCounter = 1
  workspaceSnapshot = createDefaultSnapshot()
}

export const normalChatWorkspaceMock = {
  async getBootstrap(): Promise<NormalChatBootstrap> {
    return {
      workspace: cloneSnapshot()
    }
  },

  async createAssistant(): Promise<NormalChatWorkspaceSnapshot> {
    const assistantId = `assistant-mock-${assistantCounter}`
    assistantCounter += 1

    const assistant: NormalChatAssistant = {
      ...createDefaultAssistant(),
      id: assistantId,
      name: `临时助手 ${assistantCounter}`,
      sortOrder: workspaceSnapshot.assistants.length
    }
    const topic = {
      ...createDefaultTopic(assistantId),
      id: `topic-mock-${topicCounter}`,
      title: '新话题'
    }
    topicCounter += 1

    normalizeSnapshot({
      ...workspaceSnapshot,
      assistants: [...workspaceSnapshot.assistants, assistant],
      topicsByAssistantId: {
        ...workspaceSnapshot.topicsByAssistantId,
        [assistantId]: [topic]
      },
      activeAssistantId: assistantId,
      activeTopicId: topic.id
    })

    return cloneSnapshot()
  },

  async updateAssistant(payload: {
    assistantId: string
    name?: string
    defaultSystemPrompt?: string
    saveFullConversationEnabled?: boolean
    streamingEnabled?: boolean
    callMode?: 'fast' | 'slow' | 'auto'
    costMode?: 'per_call' | 'per_token'
    maxRecursionDepth?: number
    maxRetriesPerAgent?: number
  }): Promise<NormalChatWorkspaceSnapshot> {
    updateAssistantSnapshot(payload.assistantId, (assistant) => ({
      ...assistant,
      name: payload.name ?? assistant.name,
      defaultSystemPrompt: payload.defaultSystemPrompt ?? assistant.defaultSystemPrompt,
      saveFullConversationEnabled:
        payload.saveFullConversationEnabled ?? assistant.saveFullConversationEnabled,
      streamingEnabled: payload.streamingEnabled ?? assistant.streamingEnabled,
      callMode: payload.callMode ?? assistant.callMode,
      costMode: payload.costMode ?? assistant.costMode,
      maxRecursionDepth: payload.maxRecursionDepth ?? assistant.maxRecursionDepth,
      maxRetriesPerAgent: payload.maxRetriesPerAgent ?? assistant.maxRetriesPerAgent
    }))

    return cloneSnapshot()
  },

  async assignLabel(payload: {
    assistantId: string
    labelId: string | null
  }): Promise<NormalChatWorkspaceSnapshot> {
    updateAssistantSnapshot(payload.assistantId, (assistant) => ({
      ...assistant,
      labelId: payload.labelId
    }))

    return cloneSnapshot()
  },

  async createLabel(payload: { name: string }): Promise<NormalChatWorkspaceSnapshot> {
    const label: NormalChatLabel = {
      id: `label-mock-${labelCounter}`,
      name: payload.name,
      sortOrder: workspaceSnapshot.labels.length
    }
    labelCounter += 1

    normalizeSnapshot({
      ...workspaceSnapshot,
      labels: [...workspaceSnapshot.labels, label]
    })

    return cloneSnapshot()
  },

  async renameLabel(payload: {
    labelId: string
    name: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    normalizeSnapshot({
      ...workspaceSnapshot,
      labels: workspaceSnapshot.labels.map((label) =>
        label.id === payload.labelId ? { ...label, name: payload.name } : label
      )
    })

    return cloneSnapshot()
  },

  async deleteLabel(payload: { labelId: string }): Promise<NormalChatWorkspaceSnapshot> {
    normalizeSnapshot({
      ...workspaceSnapshot,
      labels: workspaceSnapshot.labels.filter((label) => label.id !== payload.labelId),
      assistants: workspaceSnapshot.assistants.map((assistant) =>
        assistant.labelId === payload.labelId ? { ...assistant, labelId: null } : assistant
      )
    })

    return cloneSnapshot()
  },

  async setActiveAssistant(payload: {
    assistantId: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    const topics = workspaceSnapshot.topicsByAssistantId[payload.assistantId] ?? []
    normalizeSnapshot({
      ...workspaceSnapshot,
      activeAssistantId: payload.assistantId,
      activeTopicId: topics[0]?.id ?? ''
    })

    return cloneSnapshot()
  },

  async createTopic(payload: { assistantId: string }): Promise<NormalChatWorkspaceSnapshot> {
    const topic: NormalChatTopic = {
      ...createDefaultTopic(payload.assistantId),
      id: `topic-mock-${topicCounter}`,
      title: `新话题 ${topicCounter}`,
      sortOrder: (workspaceSnapshot.topicsByAssistantId[payload.assistantId] ?? []).length
    }
    topicCounter += 1

    normalizeSnapshot({
      ...workspaceSnapshot,
      topicsByAssistantId: {
        ...workspaceSnapshot.topicsByAssistantId,
        [payload.assistantId]: [
          ...(workspaceSnapshot.topicsByAssistantId[payload.assistantId] ?? []),
          topic
        ]
      },
      activeAssistantId: payload.assistantId,
      activeTopicId: topic.id
    })

    return cloneSnapshot()
  },

  async renameTopic(payload: {
    assistantId: string
    topicId: string
    title: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    updateTopicSnapshot(payload.assistantId, payload.topicId, (topic) => ({
      ...topic,
      title: payload.title
    }))

    return cloneSnapshot()
  },

  async deleteTopic(payload: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    const currentTopics = workspaceSnapshot.topicsByAssistantId[payload.assistantId] ?? []
    const nextTopics = currentTopics.filter((topic) => topic.id !== payload.topicId)
    const fallbackTopic =
      nextTopics[0] ??
      (() => {
        const topic = createDefaultTopic(payload.assistantId)
        return {
          ...topic,
          id: `topic-mock-${topicCounter++}`,
          title: '默认话题'
        }
      })()

    normalizeSnapshot({
      ...workspaceSnapshot,
      topicsByAssistantId: {
        ...workspaceSnapshot.topicsByAssistantId,
        [payload.assistantId]: nextTopics.length > 0 ? nextTopics : [fallbackTopic]
      },
      activeAssistantId: payload.assistantId,
      activeTopicId:
        workspaceSnapshot.activeTopicId === payload.topicId
          ? fallbackTopic.id
          : workspaceSnapshot.activeTopicId
    })

    return cloneSnapshot()
  },

  async setActiveTopic(payload: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot> {
    normalizeSnapshot({
      ...workspaceSnapshot,
      activeAssistantId: payload.assistantId,
      activeTopicId: payload.topicId
    })

    return cloneSnapshot()
  },

  async updateTopicPrompt(payload: {
    assistantId: string
    topicId: string
    mode: 'inherit' | 'override'
    promptOverride?: string | null
  }): Promise<NormalChatWorkspaceSnapshot> {
    updateTopicSnapshot(payload.assistantId, payload.topicId, (topic) => ({
      ...topic,
      systemPromptMode: payload.mode,
      systemPromptOverride: payload.mode === 'override' ? (payload.promptOverride ?? '') : null
    }))

    return cloneSnapshot()
  },

  async updateTopicStreaming(payload: {
    assistantId: string
    topicId: string
    mode: 'inherit' | 'override'
    streamingEnabledOverride?: boolean | null
  }): Promise<NormalChatWorkspaceSnapshot> {
    updateTopicSnapshot(payload.assistantId, payload.topicId, (topic) => ({
      ...topic,
      streamingMode: payload.mode,
      streamingEnabledOverride:
        payload.mode === 'override' ? (payload.streamingEnabledOverride ?? true) : null
    }))

    return cloneSnapshot()
  }
}
