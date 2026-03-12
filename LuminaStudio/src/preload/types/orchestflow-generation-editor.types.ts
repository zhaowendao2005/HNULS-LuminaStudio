import type {
  OFPlanningCommandMode,
  OFPlanningDocument as OFSharedPlanningDocument,
  OFPlanningEditCommand,
  OFPlanningSectionKey,
  OFRequirementDocument
} from '@shared/Orchestraflow-types'
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
export type GenerationPlanningStreamSectionKey = OFPlanningSectionKey
export type GenerationCopilotEditStatus = 'noop' | 'pending' | 'applied' | 'rejected' | 'failed'

export interface GenerationStageConfig {
  stageKey: GenerationStageKey
  providerId: string | null
  modelId: string | null
  sdkVendor: GenerationSdkVendor | null
  memoryRounds: number
  copilotMemoryRounds: number
  autoApproved: boolean
  activePlanningDocumentId: string | null
}

export interface GenerationDocument {
  documentKey: GenerationStageKey
  title: string
  fileName: string
  summary: string
  content: string
}

export interface GenerationPlanningDocument extends OFSharedPlanningDocument {
  id: string
  sessionId: string
  stageKey: GenerationStageKey
  sourceMessageId: string
  title: string
  sourceMarkdown: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface GenerationPlanningBlockStreamingState {
  isStreaming: boolean
  activeSection: GenerationPlanningStreamSectionKey
  completedSectionKeys: GenerationPlanningStreamSectionKey[]
}

export interface GenerationGlobalSettings {
  persistRawLlmData: boolean
}

export interface GenerationPlanningBlockPayload {
  kind: 'analysis-planning'
  version: '2.0'
  agentId: string
  trigger: 'explicit' | 'auto'
  status: GenerationAnalysisPlanningStatus
  analysisMarkdown: string
  designMarkdown: string
  documentId?: string | null
  streamingState?: GenerationPlanningBlockStreamingState
  /**
   * 向后兼容旧消息：历史 metaJson 里还是 requirementDocument 结构。
   * 新协议不再写它，但读取旧消息时仍允许存在。
   */
  requirementDocument?: OFRequirementDocument
}

export interface GenerationCopilotEditBlockPayload {
  kind: 'planning-edit'
  documentId: string
  mode: OFPlanningCommandMode
  commandDsl: string
  commands: OFPlanningEditCommand[]
  status: GenerationCopilotEditStatus
  affectedSectionKeys: OFPlanningSectionKey[]
  errorMessage?: string | null
}

export interface GenerationMessageMetaPayload {
  vendor?: GenerationSdkVendor
  protocol?: ModelProviderProtocol
  agentId?: string
  mode?: GenerationAnalysisAgentMode
  planningBlock?: GenerationPlanningBlockPayload | null
  copilotEditBlock?: GenerationCopilotEditBlockPayload | null
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
  rawResponseText: string | null
  rawTraceJson: string | null
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
  planningDocuments: GenerationPlanningDocument[]
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

export interface GenerationSavePlanningDocumentRequest {
  sessionId: string
  document: GenerationPlanningDocument
}

export interface GenerationSelectPlanningDocumentRequest {
  sessionId: string
  stageKey: GenerationStageKey
  documentId: string
}

export interface GenerationCreatePlanningDocumentFromMessageRequest {
  sessionId: string
  messageId: string
}

export interface GenerationApplyPlanningCommandProposalRequest {
  sessionId: string
  messageId: string
}

export interface GenerationRejectPlanningCommandProposalRequest {
  sessionId: string
  messageId: string
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

export interface GenerationDeleteSessionRequest {
  sessionId: string
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
  savePlanningDocument: (
    request: GenerationSavePlanningDocumentRequest
  ) => Promise<ApiResponse<GenerationPlanningDocument>>
  selectPlanningDocument: (
    request: GenerationSelectPlanningDocumentRequest
  ) => Promise<ApiResponse<GenerationStageConfig>>
  getOrCreatePlanningDocumentFromMessage: (
    request: GenerationCreatePlanningDocumentFromMessageRequest
  ) => Promise<ApiResponse<GenerationPlanningDocument>>
  applyPlanningCommandProposal: (
    request: GenerationApplyPlanningCommandProposalRequest
  ) => Promise<ApiResponse<GenerationPlanningDocument>>
  rejectPlanningCommandProposal: (
    request: GenerationRejectPlanningCommandProposalRequest
  ) => Promise<ApiResponse<GenerationMessage>>
  listMessages: (
    request: GenerationListMessagesRequest
  ) => Promise<ApiResponse<GenerationMessage[]>>
  sendMessage: (
    request: GenerationSendMessageRequest
  ) => Promise<ApiResponse<{ requestId: string }>>
  abortMessage: (request: GenerationAbortMessageRequest) => Promise<ApiResponse<void>>
  deleteSession: (request: GenerationDeleteSessionRequest) => Promise<ApiResponse<void>>
  getGlobalSettings: () => Promise<ApiResponse<GenerationGlobalSettings>>
  updateGlobalSettings: (
    settings: Partial<GenerationGlobalSettings>
  ) => Promise<ApiResponse<GenerationGlobalSettings>>
  onStream: (handler: (event: GenerationStreamEvent) => void) => () => void
}
