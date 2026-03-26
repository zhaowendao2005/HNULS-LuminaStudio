import type {
  NormalChatBootstrap,
  NormalChatCostMode,
  NormalChatFunctionCallMode,
  NormalChatTopicPromptMode,
  NormalChatWorkspaceSnapshot
} from '@preload/types'
import { normalChatWorkspaceMock } from './workspace.mock'

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
    systemPromptMode?: NormalChatTopicPromptMode
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

export const NormalChatWorkspaceDatasource: NormalChatWorkspaceDatasourceLike = {
  getBootstrap() {
    // 临时重定向到 mock，先把 renderer 从 normal-chat IPC 解耦出来。
    return normalChatWorkspaceMock.getBootstrap()
  },
  createAssistant() {
    return normalChatWorkspaceMock.createAssistant()
  },
  updateAssistant(payload) {
    return normalChatWorkspaceMock.updateAssistant(payload)
  },
  assignLabel(payload) {
    return normalChatWorkspaceMock.assignLabel(payload)
  },
  createLabel(payload) {
    return normalChatWorkspaceMock.createLabel(payload)
  },
  renameLabel(payload) {
    return normalChatWorkspaceMock.renameLabel(payload)
  },
  deleteLabel(payload) {
    return normalChatWorkspaceMock.deleteLabel(payload)
  },
  setActiveAssistant(payload) {
    return normalChatWorkspaceMock.setActiveAssistant(payload)
  },
  createTopic(payload) {
    return normalChatWorkspaceMock.createTopic(payload)
  },
  renameTopic(payload) {
    return normalChatWorkspaceMock.renameTopic(payload)
  },
  deleteTopic(payload) {
    return normalChatWorkspaceMock.deleteTopic(payload)
  },
  setActiveTopic(payload) {
    return normalChatWorkspaceMock.setActiveTopic(payload)
  },
  updateTopicPrompt(payload) {
    return normalChatWorkspaceMock.updateTopicPrompt(payload)
  },
  updateTopicStreaming(payload) {
    return normalChatWorkspaceMock.updateTopicStreaming(payload)
  },
  updateTopicConfig(payload) {
    return normalChatWorkspaceMock.updateTopicConfig(payload)
  }
}
