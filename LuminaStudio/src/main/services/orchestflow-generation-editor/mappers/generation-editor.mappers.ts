import { parseOFPlanningMarkdown, type OFPlanningSectionKey } from '@shared/Orchestraflow-types'
import type {
  GenerationDesignDocument,
  GenerationDocument,
  GenerationGlobalSettings,
  GenerationMessage,
  GenerationPlanningDocument,
  GenerationSessionSummary,
  GenerationStageConfig
} from '@preload/types'
import type {
  GenerationDesignDocumentRow,
  GenerationDocumentRow,
  GenerationGlobalSettingsRow,
  GenerationMessageRow,
  GenerationPlanningDocumentRow,
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
    autoApproved: row.auto_approved === 1,
    activePlanningDocumentId: row.active_planning_document_id,
    activeDesignDocumentId: row.active_design_document_id
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

export function mapPlanningDocument(
  row: GenerationPlanningDocumentRow
): GenerationPlanningDocument {
  const parseResult = parseOFPlanningMarkdown(row.content)
  const safeSections = parseResult.document.sections as Record<OFPlanningSectionKey, string>

  return {
    id: row.id,
    sessionId: row.session_id,
    stageKey: row.stage_key,
    sourceMessageId: row.source_message_id,
    title: row.title,
    sourceMarkdown: row.source_markdown,
    content: row.content,
    sections: safeSections,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapDesignDocument(row: GenerationDesignDocumentRow): GenerationDesignDocument {
  return {
    id: row.id,
    sessionId: row.session_id,
    planningDocumentId: row.planning_document_id,
    planningSourceMessageId: row.planning_source_message_id,
    title: row.title,
    version: row.version,
    status: row.status,
    sourceSnapshotMarkdown: row.source_snapshot_markdown,
    contentFormat: row.content_format,
    content: row.content,
    summary: row.summary,
    diagnosticsJson: row.diagnostics_json,
    latestGenerationMessageId: row.latest_generation_message_id,
    derivedTargetType: row.derived_target_type,
    derivedTargetId: row.derived_target_id,
    derivedStatus: row.derived_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapGlobalSettings(row: GenerationGlobalSettingsRow): GenerationGlobalSettings {
  return {
    persistRawLlmData: row.persist_raw_llm_data === 1
  }
}

export function mapMessage(row: GenerationMessageRow): GenerationMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    channelKey: row.channel_key,
    designDocumentId: row.design_document_id,
    requestId: row.request_id,
    role: row.role,
    content: row.content,
    status: row.status,
    providerId: row.provider_id,
    modelId: row.model_id,
    error: row.error,
    usageJson: row.usage_json,
    metaJson: row.meta_json,
    rawResponseText: row.raw_response_text,
    rawTraceJson: row.raw_trace_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
