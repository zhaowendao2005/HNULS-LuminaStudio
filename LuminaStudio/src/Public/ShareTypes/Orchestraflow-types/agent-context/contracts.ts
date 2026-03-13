import type { OFBlueprintEditOperation } from '../blueprint/edit-operation'
import type { OFBlueprintWorkflow } from '../blueprint/types'
import type { OFBlockEnum } from '../core-types'
import type { OFPlanningDocument } from '../planning-framework'

export interface OFRequirementDocument {
  goals: string[]
  success_criteria: string[]
  constraints: string[]
  candidate_nodes: Array<{
    type: OFBlockEnum
    reason: string
  }>
  prohibitions: string[]
  human_confirmation_questions: string[]
  input_requirements: string[]
  output_requirements: string[]
  blueprint_requirements: string[]
}

export interface OFAgentContextPackManifest {
  id: string
  kind: 'requirement' | 'blueprint' | 'blueprint-text' | 'edit' | 'planning-edit'
  version: '1.0'
  title: string
  generated_at: string
}

export interface OFAgentContextSection {
  id: string
  title: string
  summary: string
  dependencies: string[]
  render_kind: 'markdown' | 'json'
}

export interface OFAgentContextPack {
  manifest: OFAgentContextPackManifest
  sections: OFAgentContextSection[]
  payload: Record<string, unknown>
}

export interface OFBuildRequirementContextPackParams {
  document?: OFRequirementDocument
}

export interface OFBuildBlueprintContextPackParams {
  blueprint?: OFBlueprintWorkflow
}

export interface OFBuildBlueprintTextContextPackParams {
  blueprint?: OFBlueprintWorkflow | null
  snapshotMarkdown?: string
  currentDsl?: string
}

export interface OFBuildEditContextPackParams {
  blueprint?: OFBlueprintWorkflow
  operations?: OFBlueprintEditOperation[]
}

export interface OFBuildPlanningEditContextPackParams {
  document?: OFPlanningDocument
  sourceDocument?: OFPlanningDocument
}
