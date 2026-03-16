import type { OFNodeAuthoringToken } from '../node-definition'

export type OFAuthoringTomlDiagnosticCategory =
  | 'syntax'
  | 'field'
  | 'reference'
  | 'topology'
  | 'semantic'

export interface OFAuthoringTomlDiagnostic {
  category: OFAuthoringTomlDiagnosticCategory
  code: string
  message: string
  nodeId?: string
  path?: string
}

export interface OFAuthoringTomlWorkflowSection {
  name: string
  description?: string
}

export interface OFAuthoringTomlNodeRecord {
  id: string
  type: OFNodeAuthoringToken
  title: string
  description?: string
  [key: string]: unknown
}

export interface OFAuthoringTomlEdgeRecord {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface OFAuthoringTomlDocument {
  workflow: OFAuthoringTomlWorkflowSection
  nodes: OFAuthoringTomlNodeRecord[]
  edges: OFAuthoringTomlEdgeRecord[]
}

export interface OFAuthoringTomlParseResult {
  document: OFAuthoringTomlDocument | null
  diagnostics: OFAuthoringTomlDiagnostic[]
}

export interface OFAuthoringTomlValidationReport {
  valid: boolean
  diagnostics: OFAuthoringTomlDiagnostic[]
}
