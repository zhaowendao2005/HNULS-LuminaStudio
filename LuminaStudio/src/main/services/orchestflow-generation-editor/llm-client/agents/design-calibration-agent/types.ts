import type { WebContents } from 'electron'
import type {
  GenerationChannelKey,
  GenerationDesignDocument,
  GenerationSdkVendor,
  GenerationStageConfig,
  ModelProviderProtocol
} from '@preload/types'
import type { OFBlueprintTextDiagnostic } from '@shared/Orchestraflow-types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import type { ActiveGenerationStream } from '../../../types/stream.types'

export interface StartDesignCalibrationAgentStreamParams {
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
  persistRawLlmData: boolean
  stageConfig: GenerationStageConfig
  designDocument: GenerationDesignDocument
  userMessage: string
  contextBudgetChars: number
}

export interface DesignCalibrationPassContextBundle {
  planningSnapshotText: string
  diagnosticsSummaryText: string
  targetDiagnosticsText: string
  dslContextText: string
  promptSourceText: string
  targetDiagnostics: OFBlueprintTextDiagnostic[]
}

export interface DesignCalibrationModelResult {
  rawText: string
  visibleText: string
  replacementDsl: string
  usage?: Record<string, unknown>
  rawTrace: unknown[]
  truncatedTailDiscarded: boolean
}
