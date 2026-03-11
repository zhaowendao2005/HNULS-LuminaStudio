import type { ApiResponse } from './base.types'

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
