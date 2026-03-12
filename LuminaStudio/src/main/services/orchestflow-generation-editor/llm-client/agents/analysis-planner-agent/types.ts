import type { WebContents } from 'electron'
import type { OFRequirementDocument } from '@shared/Orchestraflow-types'
import type {
  GenerationAnalysisAgentMode,
  GenerationAnalysisPlanningStatus,
  GenerationChannelKey,
  GenerationMessage,
  GenerationPlanningBlockFieldKey,
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
  rawText: string
  usage?: Record<string, unknown>
}

export interface AnalysisPlannerStructuredResult {
  mode: GenerationAnalysisAgentMode
  trigger: 'explicit' | 'auto'
  assistantText: string
  planningStatus?: GenerationAnalysisPlanningStatus
  summary?: string
  requirementDocument?: OFRequirementDocument
  missingQuestions?: string[]
  readinessSignals?: string[]
}

export interface AnalysisPlanningProgressState {
  shouldShowPlanningBlock: boolean
  completedFieldKeys: GenerationPlanningBlockFieldKey[]
  activeSection: GenerationPlanningStreamSectionKey
}
