import type {
  NormalChatBootstrap,
  NormalChatCostMode,
  NormalChatFunctionCallMode,
  NormalChatTopicPromptMode,
  NormalChatWorkspaceSnapshot
} from '@preload/types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat workspace request failed')
  }

  return response.data as T
}

export interface NormalChatWorkspaceDatasourceLike {
  getBootstrap(): Promise<NormalChatBootstrap>
  createAssistant(): Promise<NormalChatWorkspaceSnapshot>
  updateAssistant(payload: {
    assistantId: string
    name?: string
    defaultSystemPrompt?: string
    streamingEnabled?: boolean
    callMode?: 'fast' | 'slow' | 'auto'
    costMode?: NormalChatCostMode
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
  }): Promise<NormalChatWorkspaceSnapshot>
  assignLabel(payload: {
    assistantId: string
    labelId: string | null
  }): Promise<NormalChatWorkspaceSnapshot>
  createLabel(payload: { name: string }): Promise<NormalChatWorkspaceSnapshot>
  renameLabel(payload: { labelId: string; name: string }): Promise<NormalChatWorkspaceSnapshot>
  deleteLabel(payload: { labelId: string }): Promise<NormalChatWorkspaceSnapshot>
  setActiveAssistant(payload: { assistantId: string }): Promise<NormalChatWorkspaceSnapshot>
  createTopic(payload: { assistantId: string }): Promise<NormalChatWorkspaceSnapshot>
  renameTopic(payload: {
    assistantId: string
    topicId: string
    title: string
  }): Promise<NormalChatWorkspaceSnapshot>
  deleteTopic(payload: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot>
  setActiveTopic(payload: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot>
  updateTopicPrompt(payload: {
    assistantId: string
    topicId: string
    mode: NormalChatTopicPromptMode
    promptOverride?: string | null
  }): Promise<NormalChatWorkspaceSnapshot>
  updateTopicStreaming(payload: {
    assistantId: string
    topicId: string
    mode: 'inherit' | 'override'
    streamingEnabledOverride?: boolean | null
  }): Promise<NormalChatWorkspaceSnapshot>
  updateTopicConfig(payload: {
    assistantId: string
    topicId: string
    systemPromptMode?: 'inherit' | 'override'
    systemPromptOverride?: string | null
    streamingMode?: 'inherit' | 'override'
    streamingEnabledOverride?: boolean | null
    costMode?: 'inherit' | 'override'
    costModeOverride?: NormalChatCostMode | null
    modelMode?: 'inherit' | 'override'
    modelProviderIdOverride?: string | null
    modelIdOverride?: string | null
    contextMemoryRoundsMode?: 'inherit' | 'override'
    contextMemoryRoundsOverride?: number | null
    maxRecursionDepthMode?: 'inherit' | 'override'
    maxRecursionDepthOverride?: number | null
    maxReasoningStepsMode?: 'inherit' | 'override'
    maxReasoningStepsOverride?: number | null
    systemActionFunctionCallMode?: 'inherit' | 'override'
    systemActionFunctionCallEnabledOverride?: boolean | null
    systemActionSubAgentMode?: 'inherit' | 'override'
    systemActionSubAgentEnabledOverride?: boolean | null
    functionCallPubMedMode?: 'inherit' | 'override'
    functionCallPubMedEnabledOverride?: boolean | null
    functionCallPubMedExecutionMode?: 'inherit' | 'override'
    functionCallPubMedExecutionModeOverride?: NormalChatFunctionCallMode | null
    mcpMode?: 'inherit' | 'override'
    mcpEnabledOverride?: boolean | null
  }): Promise<NormalChatWorkspaceSnapshot>
}

const realDatasource: NormalChatWorkspaceDatasourceLike = {
  getBootstrap() {
    return window.api.normalChat.getBootstrap().then(unwrap)
  },
  createAssistant() {
    return window.api.normalChat.createAssistant({}).then(unwrap)
  },
  updateAssistant(payload) {
    return window.api.normalChat.updateAssistant(payload).then(unwrap)
  },
  assignLabel(payload) {
    return window.api.normalChat.assignLabel(payload).then(unwrap)
  },
  createLabel(payload) {
    return window.api.normalChat.createLabel(payload).then(unwrap)
  },
  renameLabel(payload) {
    return window.api.normalChat.renameLabel(payload).then(unwrap)
  },
  deleteLabel(payload) {
    return window.api.normalChat.deleteLabel(payload).then(unwrap)
  },
  setActiveAssistant(payload) {
    return window.api.normalChat.setActiveAssistant(payload).then(unwrap)
  },
  createTopic(payload) {
    return window.api.normalChat.createTopic(payload).then(unwrap)
  },
  renameTopic(payload) {
    return window.api.normalChat.renameTopic(payload).then(unwrap)
  },
  deleteTopic(payload) {
    return window.api.normalChat.deleteTopic(payload).then(unwrap)
  },
  setActiveTopic(payload) {
    return window.api.normalChat.setActiveTopic(payload).then(unwrap)
  },
  updateTopicPrompt(payload) {
    return window.api.normalChat.updateTopicPrompt(payload).then(unwrap)
  },
  updateTopicStreaming(payload) {
    return window.api.normalChat.updateTopicStreaming(payload).then(unwrap)
  },
  updateTopicConfig(payload) {
    return window.api.normalChat.updateTopicConfig(payload).then(unwrap)
  }
}

let datasource: NormalChatWorkspaceDatasourceLike = realDatasource

export function setNormalChatWorkspaceDatasourceForTesting(
  nextDatasource: NormalChatWorkspaceDatasourceLike
): void {
  datasource = nextDatasource
}

export function resetNormalChatWorkspaceDatasourceForTesting(): void {
  datasource = realDatasource
}

export const NormalChatWorkspaceDatasource: NormalChatWorkspaceDatasourceLike = {
  getBootstrap() {
    return datasource.getBootstrap()
  },
  createAssistant() {
    return datasource.createAssistant()
  },
  updateAssistant(payload) {
    return datasource.updateAssistant(payload)
  },
  assignLabel(payload) {
    return datasource.assignLabel(payload)
  },
  createLabel(payload) {
    return datasource.createLabel(payload)
  },
  renameLabel(payload) {
    return datasource.renameLabel(payload)
  },
  deleteLabel(payload) {
    return datasource.deleteLabel(payload)
  },
  setActiveAssistant(payload) {
    return datasource.setActiveAssistant(payload)
  },
  createTopic(payload) {
    return datasource.createTopic(payload)
  },
  renameTopic(payload) {
    return datasource.renameTopic(payload)
  },
  deleteTopic(payload) {
    return datasource.deleteTopic(payload)
  },
  setActiveTopic(payload) {
    return datasource.setActiveTopic(payload)
  },
  updateTopicPrompt(payload) {
    return datasource.updateTopicPrompt(payload)
  },
  updateTopicStreaming(payload) {
    return datasource.updateTopicStreaming(payload)
  },
  updateTopicConfig(payload) {
    return datasource.updateTopicConfig(payload)
  }
}
