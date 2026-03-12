import type { OFRequirementDocument } from '@shared/Orchestraflow-types'
import type { ApiResponse } from './base.types'
import type { ModelProviderProtocol } from './model-config.types'

export type GenerationStageKey = 'analysis' | 'design' | 'verify'
export type GenerationRuntimeStageKey = GenerationStageKey | 'workflow'
export type GenerationChannelKey =
  | 'analysis-discussion'
  | 'analysis-copilot'
  | 'design-copilot'
  | 'verify-copilot'
export type GenerationChatRole = 'user' | 'assistant' | 'system'
export type GenerationMessageStatus = 'streaming' | 'final' | 'aborted' | 'error'
export type GenerationSdkVendor = 'openai' | 'anthropic' | 'google'
export type GenerationAnalysisAgentMode = 'continue' | 'planning'
export type GenerationAnalysisPlanningStatus = 'draft' | 'ready'
export type GenerationPlanningBlockFieldKey =
  | 'summary'
  | 'goals'
  | 'success_criteria'
  | 'constraints'
  | 'prohibitions'
  | 'missingQuestions'
  | 'readinessSignals'
  | 'candidate_nodes'
  | 'input_requirements'
  | 'output_requirements'
  | 'human_confirmation_questions'
  | 'blueprint_requirements'
export type GenerationPlanningStreamSectionKey = 'analysis' | 'design'

export interface GenerationStageConfig {
  stageKey: GenerationStageKey
  providerId: string | null
  modelId: string | null
  sdkVendor: GenerationSdkVendor | null
  memoryRounds: number
  copilotMemoryRounds: number
  autoApproved: boolean
}

export interface GenerationDocument {
  documentKey: GenerationStageKey
  title: string
  fileName: string
  summary: string
  content: string
}

export interface GenerationPlanningBlockStreamingState {
  isStreaming: boolean
  activeSection: GenerationPlanningStreamSectionKey
  completedFieldKeys: GenerationPlanningBlockFieldKey[]
}

export interface GenerationPlanningBlockPayload {
  kind: 'analysis-planning'
  version: '1.0'
  agentId: string
  trigger: 'explicit' | 'auto'
  status: GenerationAnalysisPlanningStatus
  summary: string
  readinessSignals: string[]
  missingQuestions: string[]
  requirementDocument: OFRequirementDocument
  streamingState?: GenerationPlanningBlockStreamingState
}

export interface GenerationMessageMetaPayload {
  vendor?: GenerationSdkVendor
  protocol?: ModelProviderProtocol
  agentId?: string
  mode?: GenerationAnalysisAgentMode
  planningBlock?: GenerationPlanningBlockPayload | null
}

export interface GenerationMessage {
  id: string
  sessionId: string
  channelKey: GenerationChannelKey
  requestId: string | null
  role: GenerationChatRole
  content: string
  status: GenerationMessageStatus
  providerId: string | null
  modelId: string | null
  error: string | null
  usageJson: string | null
  metaJson: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerationSessionSummary {
  id: string
  title: string
  currentStage: GenerationRuntimeStageKey
  summary: string
  analysisTurnCount: number
  planGenerated: boolean
  createdAt: string
  updatedAt: string
}

export interface GenerationSessionDetail extends GenerationSessionSummary {
  stageConfigs: GenerationStageConfig[]
  documents: GenerationDocument[]
  messages: GenerationMessage[]
}

export interface GenerationCreateSessionRequest {
  title: string
}

export interface GenerationUpdateSessionStateRequest {
  sessionId: string
  currentStage?: GenerationRuntimeStageKey
  summary?: string
  analysisTurnCount?: number
  planGenerated?: boolean
}

export interface GenerationSaveStageConfigRequest {
  sessionId: string
  config: GenerationStageConfig
}

export interface GenerationSaveDocumentRequest {
  sessionId: string
  document: GenerationDocument
}

export interface GenerationListMessagesRequest {
  sessionId: string
  channelKey: GenerationChannelKey
}

export interface GenerationSendMessageRequest {
  sessionId: string
  channelKey: GenerationChannelKey
  providerId: string
  modelId: string
  content: string
}

export interface GenerationAbortMessageRequest {
  requestId: string
}

export interface GenerationStreamStartEvent {
  type: 'stream-start'
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
}

export interface GenerationTextDeltaEvent {
  type: 'text-delta'
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  delta: string
}

export interface GenerationMessageMetaEvent {
  type: 'message-meta'
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  metaJson: string | null
}

export interface GenerationFinishEvent {
  type: 'finish'
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  finishReason: 'stop' | 'aborted' | 'error'
  usageJson?: string | null
}

export interface GenerationErrorEvent {
  type: 'error'
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  message: string
}

export type GenerationStreamEvent =
  | GenerationStreamStartEvent
  | GenerationTextDeltaEvent
  | GenerationMessageMetaEvent
  | GenerationFinishEvent
  | GenerationErrorEvent

export interface OrchestrflowGenerationEditorAPI {
  listSessions: () => Promise<ApiResponse<GenerationSessionSummary[]>>
  createSession: (
    request: GenerationCreateSessionRequest
  ) => Promise<ApiResponse<GenerationSessionDetail>>
  getSessionDetail: (sessionId: string) => Promise<ApiResponse<GenerationSessionDetail>>
  updateSessionState: (
    request: GenerationUpdateSessionStateRequest
  ) => Promise<ApiResponse<GenerationSessionSummary>>
  saveStageConfig: (
    request: GenerationSaveStageConfigRequest
  ) => Promise<ApiResponse<GenerationStageConfig>>
  saveDocument: (request: GenerationSaveDocumentRequest) => Promise<ApiResponse<GenerationDocument>>
  listMessages: (
    request: GenerationListMessagesRequest
  ) => Promise<ApiResponse<GenerationMessage[]>>
  sendMessage: (
    request: GenerationSendMessageRequest
  ) => Promise<ApiResponse<{ requestId: string }>>
  abortMessage: (request: GenerationAbortMessageRequest) => Promise<ApiResponse<void>>
  onStream: (handler: (event: GenerationStreamEvent) => void) => () => void
}
