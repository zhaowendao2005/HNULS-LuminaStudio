import type {
  NormalChatCallMode,
  NormalChatCostMode,
  NormalChatTopicPromptMode
} from './common.types'

export type NormalChatFunctionCallMode = 'fast' | 'slow'
export type NormalChatPersistencePreset = 'light' | 'full'

export interface NormalChatLabel {
  id: string
  name: string
  sortOrder: number
}

export interface NormalChatAssistant {
  id: string
  name: string
  emoji: string
  labelId: string | null
  defaultSystemPrompt: string
  streamingEnabled: boolean
  callMode: NormalChatCallMode
  costMode: NormalChatCostMode
  defaultModelProviderId: string | null
  defaultModelId: string | null
  contextMemoryRounds: number
  maxRecursionDepth: number
  maxReasoningSteps: number
  systemActionFunctionCallEnabled: boolean
  systemActionSubAgentEnabled: boolean
  functionCallPubMedEnabled: boolean
  functionCallPubMedMode: NormalChatFunctionCallMode
  functionCallKnowledgeRetrievalEnabled: boolean
  functionCallKnowledgeRetrievalMode: NormalChatFunctionCallMode
  functionCallKgRetrievalEnabled: boolean
  functionCallKgRetrievalMode: NormalChatFunctionCallMode
  mcpEnabled: boolean
  persistencePreset: NormalChatPersistencePreset
  sortOrder: number
}

export interface NormalChatTopic {
  id: string
  assistantId: string
  title: string
  systemPromptMode: NormalChatTopicPromptMode
  systemPromptOverride: string | null
  streamingMode: 'inherit' | 'override'
  streamingEnabledOverride: boolean | null
  costMode: 'inherit' | 'override'
  costModeOverride: NormalChatCostMode | null
  modelMode: 'inherit' | 'override'
  modelProviderIdOverride: string | null
  modelIdOverride: string | null
  contextMemoryRoundsMode: 'inherit' | 'override'
  contextMemoryRoundsOverride: number | null
  maxRecursionDepthMode: 'inherit' | 'override'
  maxRecursionDepthOverride: number | null
  maxReasoningStepsMode: 'inherit' | 'override'
  maxReasoningStepsOverride: number | null
  systemActionFunctionCallMode: 'inherit' | 'override'
  systemActionFunctionCallEnabledOverride: boolean | null
  systemActionSubAgentMode: 'inherit' | 'override'
  systemActionSubAgentEnabledOverride: boolean | null
  functionCallPubMedMode: 'inherit' | 'override'
  functionCallPubMedEnabledOverride: boolean | null
  functionCallPubMedExecutionMode: 'inherit' | 'override'
  functionCallPubMedExecutionModeOverride: NormalChatFunctionCallMode | null
  functionCallKnowledgeRetrievalMode: 'inherit' | 'override'
  functionCallKnowledgeRetrievalEnabledOverride: boolean | null
  functionCallKnowledgeRetrievalExecutionMode: 'inherit' | 'override'
  functionCallKnowledgeRetrievalExecutionModeOverride: NormalChatFunctionCallMode | null
  functionCallKgRetrievalMode: 'inherit' | 'override'
  functionCallKgRetrievalEnabledOverride: boolean | null
  functionCallKgRetrievalExecutionMode: 'inherit' | 'override'
  functionCallKgRetrievalExecutionModeOverride: NormalChatFunctionCallMode | null
  mcpMode: 'inherit' | 'override'
  mcpEnabledOverride: boolean | null
  sortOrder: number
}

export interface NormalChatWorkspaceSnapshot {
  labels: NormalChatLabel[]
  assistants: NormalChatAssistant[]
  topicsByAssistantId: Record<string, NormalChatTopic[]>
  activeAssistantId: string
  activeTopicId: string
}

export interface NormalChatBootstrap {
  workspace: NormalChatWorkspaceSnapshot
}

export interface NormalChatCreateAssistantRequest {}

export interface NormalChatUpdateAssistantRequest {
  assistantId: string
  name?: string
  defaultSystemPrompt?: string
  streamingEnabled?: boolean
  callMode?: NormalChatCallMode
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
  functionCallKnowledgeRetrievalEnabled?: boolean
  functionCallKnowledgeRetrievalMode?: NormalChatFunctionCallMode
  functionCallKgRetrievalEnabled?: boolean
  functionCallKgRetrievalMode?: NormalChatFunctionCallMode
  mcpEnabled?: boolean
  persistencePreset?: NormalChatPersistencePreset
}

export interface NormalChatAssignLabelRequest {
  assistantId: string
  labelId: string | null
}

export interface NormalChatCreateLabelRequest {
  name: string
}

export interface NormalChatRenameLabelRequest {
  labelId: string
  name: string
}

export interface NormalChatDeleteLabelRequest {
  labelId: string
}

export interface NormalChatSetActiveAssistantRequest {
  assistantId: string
}

export interface NormalChatDeleteAssistantRequest {
  assistantId: string
}

export interface NormalChatCreateTopicRequest {
  assistantId: string
}

export interface NormalChatRenameTopicRequest {
  assistantId: string
  topicId: string
  title: string
}

export interface NormalChatDeleteTopicRequest {
  assistantId: string
  topicId: string
}

export interface NormalChatSetActiveTopicRequest {
  assistantId: string
  topicId: string
}

export interface NormalChatUpdateTopicPromptRequest {
  assistantId: string
  topicId: string
  mode: NormalChatTopicPromptMode
  promptOverride?: string | null
}

export interface NormalChatUpdateTopicStreamingRequest {
  assistantId: string
  topicId: string
  mode: 'inherit' | 'override'
  streamingEnabledOverride?: boolean | null
}

export interface NormalChatUpdateTopicConfigRequest {
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
  functionCallKnowledgeRetrievalMode?: 'inherit' | 'override'
  functionCallKnowledgeRetrievalEnabledOverride?: boolean | null
  functionCallKnowledgeRetrievalExecutionMode?: 'inherit' | 'override'
  functionCallKnowledgeRetrievalExecutionModeOverride?: NormalChatFunctionCallMode | null
  functionCallKgRetrievalMode?: 'inherit' | 'override'
  functionCallKgRetrievalEnabledOverride?: boolean | null
  functionCallKgRetrievalExecutionMode?: 'inherit' | 'override'
  functionCallKgRetrievalExecutionModeOverride?: NormalChatFunctionCallMode | null
  mcpMode?: 'inherit' | 'override'
  mcpEnabledOverride?: boolean | null
}
