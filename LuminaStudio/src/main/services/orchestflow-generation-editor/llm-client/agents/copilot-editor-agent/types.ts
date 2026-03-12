import type { WebContents } from 'electron'
import type {
  GenerationChannelKey,
  GenerationPlanningDocument,
  GenerationSdkVendor,
  GenerationStageConfig,
  GenerationStageKey,
  ModelProviderProtocol
} from '@preload/types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import type { ActiveGenerationStream } from '../../../types/stream.types'

export interface StartCopilotEditorAgentStreamParams {
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
  stageKey: GenerationStageKey
  stageConfig: GenerationStageConfig
  planningDocument: GenerationPlanningDocument
  userMessage: string
}

export interface CopilotEditorContextBundle {
  planningDocument: GenerationPlanningDocument
  sourceMarkdown: string
  discussionHistoryText: string
  copilotHistoryText: string
  capabilityContextText: string
}

export interface CopilotEditorModelResult {
  rawText: string
  visibleText: string
  commandDsl: string
  usage?: Record<string, unknown>
  rawTrace: unknown[]
}
