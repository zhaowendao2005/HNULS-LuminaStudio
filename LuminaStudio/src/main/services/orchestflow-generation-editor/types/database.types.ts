import type {
  GenerationChannelKey,
  GenerationRuntimeStageKey,
  GenerationStageKey
} from '@preload/types'

export interface GenerationSessionRow {
  id: string
  title: string
  current_stage: GenerationRuntimeStageKey
  summary: string
  analysis_turn_count: number
  plan_generated: number
  created_at: string
  updated_at: string
}

export interface GenerationStageConfigRow {
  session_id: string
  stage_key: GenerationStageKey
  provider_id: string | null
  model_id: string | null
  sdk_vendor: 'openai' | 'anthropic' | 'google' | null
  memory_rounds: number
  copilot_memory_rounds: number
  auto_approved: number
  active_planning_document_id: string | null
  active_design_document_id: string | null
}

export interface GenerationDocumentRow {
  session_id: string
  document_key: GenerationStageKey
  title: string
  file_name: string
  summary: string
  content: string
}

export interface GenerationPlanningDocumentRow {
  id: string
  session_id: string
  stage_key: GenerationStageKey
  source_message_id: string
  title: string
  source_markdown: string
  content: string
  created_at: string
  updated_at: string
}

export interface GenerationDesignDocumentRow {
  id: string
  session_id: string
  planning_document_id: string
  planning_source_message_id: string
  title: string
  version: number
  status: 'draft' | 'streaming' | 'valid' | 'invalid' | 'aborted' | 'error'
  source_snapshot_markdown: string
  content_format: 'of-blueprint-section-v1'
  content: string
  summary: string
  diagnostics_json: string | null
  latest_generation_message_id: string | null
  derived_target_type: string | null
  derived_target_id: string | null
  derived_status: string | null
  created_at: string
  updated_at: string
}

export interface GenerationMessageRow {
  id: string
  session_id: string
  channel_key: GenerationChannelKey
  design_document_id: string | null
  request_id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'streaming' | 'final' | 'aborted' | 'error'
  provider_id: string | null
  model_id: string | null
  error: string | null
  usage_json: string | null
  meta_json: string | null
  raw_response_text: string | null
  raw_trace_json: string | null
  created_at: string
  updated_at: string
}

export interface GenerationGlobalSettingsRow {
  id: number
  persist_raw_llm_data: number
  created_at: string
  updated_at: string
}
