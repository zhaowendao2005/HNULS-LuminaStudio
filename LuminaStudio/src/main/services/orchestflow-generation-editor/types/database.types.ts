export interface GenerationSessionRow {
  id: string
  title: string
  current_stage: string
  summary: string
  selected_design_document_id: string | null
  created_at: string
  updated_at: string
}

export interface GenerationStageConfigRow {
  session_id: string
  stage_key: string
  provider_id: string
  model_id: string
  memory_rounds: number
  max_repair_iterations: number
  budget_limit_tokens: number
  created_at: string
  updated_at: string
}

export interface GenerationAnalysisDocumentRow {
  session_id: string
  title: string
  content: string
  summary: string
  updated_at: string
}

export interface GenerationDesignDocumentRow {
  id: string
  session_id: string
  title: string
  content: string
  content_format: string
  summary: string
  status: string
  validation_json: string | null
  planning_source_message_id: string | null
  derived_target_type: string | null
  derived_target_id: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface GenerationMessageRow {
  id: string
  session_id: string
  channel_key: string
  role: string
  status: string
  content: string
  meta_json: string | null
  request_id: string | null
  created_at: string
  updated_at: string
}

export interface GenerationGlobalSettingsRow {
  id: number
  persist_raw_llm_data: number
  updated_at: string
}
