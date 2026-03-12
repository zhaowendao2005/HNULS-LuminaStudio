import type { WebContents } from 'electron'
import type { OFRequirementDocument } from '@shared/Orchestraflow-types'
import type {
  GenerationAnalysisAgentMode,
  GenerationAnalysisPlanningStatus,
  GenerationChannelKey,
  GenerationMessage,
  GenerationPlanningBlockPayload,
  GenerationPlanningStreamSectionKey,
  GenerationSdkVendor,
  ModelProviderProtocol
} from '@preload/types'
import type { GenerationEditorRepository } from '../../repositories/generation-editor.repository'
import type { ActiveGenerationStream } from '../../types/stream.types'

export interface StartAnalysisPlannerAgentStreamParams {
  activeStreams: Map<string, ActiveGenerationStream>
  repository: GenerationEditorRepository
  sender: WebContents
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  providerId: string
  modelId: string
  vendor: GenerationSdkVendor
  protocol: ModelProviderProtocol
  apiKey: string
  baseUrl?: string
  defaultHeaders?: Record<string, string>
  memoryRounds: number
  userMessage: string
}

export interface AnalysisPlannerHistoryEntry {
  message: GenerationMessage
  planningBlock: GenerationPlanningBlockPayload | null
}

export interface AnalysisPlannerContextBundle {
  historyEntries: AnalysisPlannerHistoryEntry[]
  conversationText: string
  capabilityContextText: string
  latestPlanningBlock: GenerationPlanningBlockPayload | null
}

export interface AnalysisPlannerRuntimeSignals {
  explicitPlanningRequested: boolean
  readinessSignals: string[]
}

export interface AnalysisPlannerModelResult {
  rawPayload: string
  usage?: Record<string, unknown>
  rawTrace: unknown[]
}

export interface AnalysisPlannerStructuredResult {
  mode: GenerationAnalysisAgentMode
  trigger: 'explicit' | 'auto'
  assistantText: string
  planningStatus?: GenerationAnalysisPlanningStatus
  analysisMarkdown?: string
  designMarkdown?: string
  legacyRequirementDocument?: OFRequirementDocument
}

export interface AnalysisPlanningProgressState {
  shouldShowPlanningBlock: boolean
  activeSection: GenerationPlanningStreamSectionKey
  completedSectionKeys: GenerationPlanningStreamSectionKey[]
  analysisMarkdown: string
  designMarkdown: string
}
