import type {
  GenerationDocument,
  GenerationMessage,
  GenerationSessionSummary,
  GenerationStageConfig
} from '@preload/types'
import type {
  GenerationDocumentRow,
  GenerationMessageRow,
  GenerationSessionRow,
  GenerationStageConfigRow
} from '../types/database.types'

export function mapSessionSummary(row: GenerationSessionRow): GenerationSessionSummary {
  return {
    id: row.id,
    title: row.title,
    currentStage: row.current_stage,
    summary: row.summary,
    analysisTurnCount: row.analysis_turn_count,
    planGenerated: row.plan_generated === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapStageConfig(row: GenerationStageConfigRow): GenerationStageConfig {
  return {
    stageKey: row.stage_key,
    providerId: row.provider_id,
    modelId: row.model_id,
    sdkVendor: row.sdk_vendor,
    memoryRounds: row.memory_rounds,
    copilotMemoryRounds: row.copilot_memory_rounds,
    autoApproved: row.auto_approved === 1
  }
}

export function mapDocument(row: GenerationDocumentRow): GenerationDocument {
  return {
    documentKey: row.document_key,
    title: row.title,
    fileName: row.file_name,
    summary: row.summary,
    content: row.content
  }
}

export function mapMessage(row: GenerationMessageRow): GenerationMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    channelKey: row.channel_key,
    requestId: row.request_id,
    role: row.role,
    content: row.content,
    status: row.status,
    providerId: row.provider_id,
    modelId: row.model_id,
    error: row.error,
    usageJson: row.usage_json,
    metaJson: row.meta_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
