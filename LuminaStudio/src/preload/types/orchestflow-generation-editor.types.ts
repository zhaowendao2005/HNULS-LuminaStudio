import type { ApiResponse } from './base.types'

export type GenerationStageKey = 'analysis' | 'design'
export type GenerationChannelKey = 'analysis-planner' | 'planning-copilot' | 'design-planner'
export type GenerationChatRole = 'user' | 'assistant' | 'system'
export type GenerationMessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'aborted'
export type GenerationSdkVendor = 'openai' | 'anthropic' | 'google'
export type GenerationRunStatus = 'running' | 'completed' | 'failed' | 'aborted'
export type GenerationDesignDocumentStatus = 'draft' | 'valid' | 'invalid'
export type GenerationDesignDocumentContentFormat = 'of-workflow-toml-v1'
export type GenerationValidationCategory =
  | 'syntax'
  | 'field'
  | 'reference'
  | 'topology'
  | 'semantic'

export interface GenerationStageConfig {
  stageKey: GenerationStageKey
  providerId: string
  modelId: string
  memoryRounds: number
  maxRepairIterations: number
  budgetLimitTokens: number
}

export interface GenerationAnalysisDocument {
  documentKey: 'analysis'
  title: string
  content: string
  summary: string
  updatedAt: string
}

export interface GenerationValidationDiagnostic {
  category: GenerationValidationCategory
  code: string
  message: string
  nodeId?: string
  path?: string
}

export interface GenerationValidationReport {
  valid: boolean
  diagnostics: GenerationValidationDiagnostic[]
}

export interface GenerationDesignDocument {
  id: string
  sessionId: string
  title: string
  content: string
  contentFormat: GenerationDesignDocumentContentFormat
  summary: string
  status: GenerationDesignDocumentStatus
  validationJson: string | null
  planningSourceMessageId: string | null
  derivedTargetType: 'workflow' | null
  derivedTargetId: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface GenerationMessageMetaPayload {
  runId?: string
  stageKey?: GenerationStageKey
  vendor?: GenerationSdkVendor
  artifactDocumentId?: string
}

export interface GenerationMessage {
  id: string
  sessionId: string
  channelKey: GenerationChannelKey
  role: GenerationChatRole
  status: GenerationMessageStatus
  content: string
  metaJson: string | null
  requestId: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerationSessionSummary {
  id: string
  title: string
  currentStage: GenerationStageKey
  summary: string
  analysisTurnCount: number
  designVersionCount: number
  createdAt: string
  updatedAt: string
}

export interface GenerationSessionDetail extends GenerationSessionSummary {
  stageConfigs: GenerationStageConfig[]
  analysisDocument: GenerationAnalysisDocument
  designDocuments: GenerationDesignDocument[]
  selectedDesignDocumentId: string | null
  messages: GenerationMessage[]
}

export interface GenerationCreateSessionRequest {
  title: string
}

export interface GenerationUpdateSessionStateRequest {
  sessionId: string
  currentStage: GenerationStageKey
}

export interface GenerationSaveStageConfigRequest {
  sessionId: string
  config: GenerationStageConfig
}

export interface GenerationSaveAnalysisDocumentRequest {
  sessionId: string
  document: GenerationAnalysisDocument
}

export interface GenerationCreateDesignDocumentRequest {
  sessionId: string
  title?: string
  planningSourceMessageId?: string | null
}

export interface GenerationSaveDesignDocumentRequest {
  sessionId: string
  document: GenerationDesignDocument
}

export interface GenerationSelectDesignDocumentRequest {
  sessionId: string
  designDocumentId: string
}

export interface GenerationDeleteDesignDocumentRequest {
  sessionId: string
  designDocumentId: string
}

export interface GenerationCompileDesignDocumentToWorkflowRequest {
  sessionId: string
  designDocumentId: string
}

export interface GenerationCompileDesignDocumentToWorkflowResult {
  designDocument: GenerationDesignDocument
  workflowId: string
}

export interface GenerationListMessagesRequest {
  sessionId: string
  channelKey: GenerationChannelKey
}

export interface GenerationSendMessageRequest {
  sessionId: string
  channelKey: GenerationChannelKey
  text: string
  providerId: string
  modelId: string
  designDocumentId?: string | null
}

export interface GenerationAbortMessageRequest {
  requestId: string
}

export interface GenerationDeleteSessionRequest {
  sessionId: string
}

export interface GenerationGlobalSettings {
  persistRawLlmData: boolean
}

export interface GenerationRunStartEvent {
  type: 'run-start'
  runId: string
  requestId: string
  messageId: string
  sessionId: string
  channelKey: GenerationChannelKey
  stageKey: GenerationStageKey
  startedAt: string
}

export interface GenerationTextDeltaEvent {
  type: 'text-delta'
  runId: string
  messageId: string
  delta: string
}

export interface GenerationArtifactReplaceEvent {
  type: 'artifact-replace'
  runId: string
  artifact: 'analysis-document' | 'design-document'
  documentId?: string
  content: string
  summary: string
}

export interface GenerationPromptSnapshotEvent {
  type: 'prompt-snapshot'
  runId: string
  stepKey: string
  title: string
  prompt: string
}

export interface GenerationContextSnapshotEvent {
  type: 'context-snapshot'
  runId: string
  stepKey: string
  title: string
  context: string
}

export interface GenerationMemorySnapshotEvent {
  type: 'memory-snapshot'
  runId: string
  stepKey: string
  memory: Record<string, unknown>
}

export interface GenerationValidationReportEvent {
  type: 'validation-report'
  runId: string
  report: GenerationValidationReport
}

export interface GenerationBudgetEvent {
  type: 'budget-update'
  runId: string
  spentTokens: number
  iteration: number
  maxIterations: number
}

export interface GenerationFinishEvent {
  type: 'run-finish'
  runId: string
  messageId: string
  status: Extract<GenerationRunStatus, 'completed' | 'aborted'>
  finishedAt: string
}

export interface GenerationErrorEvent {
  type: 'run-error'
  runId: string
  messageId: string
  error: string
}

export type GenerationStreamEvent =
  | GenerationRunStartEvent
  | GenerationTextDeltaEvent
  | GenerationArtifactReplaceEvent
  | GenerationPromptSnapshotEvent
  | GenerationContextSnapshotEvent
  | GenerationMemorySnapshotEvent
  | GenerationValidationReportEvent
  | GenerationBudgetEvent
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
  ) => Promise<ApiResponse<GenerationSessionDetail>>
  saveStageConfig: (
    request: GenerationSaveStageConfigRequest
  ) => Promise<ApiResponse<GenerationStageConfig>>
  saveAnalysisDocument: (
    request: GenerationSaveAnalysisDocumentRequest
  ) => Promise<ApiResponse<GenerationAnalysisDocument>>
  createDesignDocument: (
    request: GenerationCreateDesignDocumentRequest
  ) => Promise<ApiResponse<GenerationDesignDocument>>
  saveDesignDocument: (
    request: GenerationSaveDesignDocumentRequest
  ) => Promise<ApiResponse<GenerationDesignDocument>>
  selectDesignDocument: (
    request: GenerationSelectDesignDocumentRequest
  ) => Promise<ApiResponse<GenerationSessionDetail>>
  deleteDesignDocument: (
    request: GenerationDeleteDesignDocumentRequest
  ) => Promise<ApiResponse<void>>
  compileDesignDocumentToWorkflow: (
    request: GenerationCompileDesignDocumentToWorkflowRequest
  ) => Promise<ApiResponse<GenerationCompileDesignDocumentToWorkflowResult>>
  listMessages: (
    request: GenerationListMessagesRequest
  ) => Promise<ApiResponse<GenerationMessage[]>>
  getGlobalSettings: () => Promise<ApiResponse<GenerationGlobalSettings>>
  updateGlobalSettings: (
    settings: Partial<GenerationGlobalSettings>
  ) => Promise<ApiResponse<GenerationGlobalSettings>>
  sendMessage: (request: GenerationSendMessageRequest) => Promise<ApiResponse<GenerationMessage>>
  abortMessage: (request: GenerationAbortMessageRequest) => Promise<ApiResponse<void>>
  deleteSession: (request: GenerationDeleteSessionRequest) => Promise<ApiResponse<void>>
  onStream: (handler: (event: GenerationStreamEvent) => void) => () => void
}
