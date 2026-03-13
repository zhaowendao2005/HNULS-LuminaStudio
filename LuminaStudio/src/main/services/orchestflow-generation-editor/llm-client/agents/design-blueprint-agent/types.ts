import type { WebContents } from 'electron'
import type {
  GenerationChannelKey,
  GenerationDesignDocument,
  GenerationSdkVendor,
  GenerationStageConfig,
  ModelProviderProtocol
} from '@preload/types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import type { ActiveGenerationStream } from '../../../types/stream.types'

export interface StartDesignBlueprintAgentStreamParams {
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
}

export interface DesignBlueprintContextBundle {
  snapshotMarkdown: string
  currentDsl: string
  copilotHistoryText: string
  capabilityContextText: string
}
