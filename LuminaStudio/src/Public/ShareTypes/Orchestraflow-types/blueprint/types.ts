import type { OFBlockEnum } from '../core-types'

export interface OFBlueprintWorkflowMeta {
  name: string
  description?: string
  author?: string
}

export interface OFBlueprintEdgeEndpoint {
  node: string
  handle?: string
}

export interface OFBlueprintEdge {
  id?: string
  from: OFBlueprintEdgeEndpoint
  to: OFBlueprintEdgeEndpoint
}

export interface OFBlueprintSubgraph {
  nodes: OFBlueprintNode[]
  edges: OFBlueprintEdge[]
}

export interface OFBlueprintNode {
  id: string
  type: OFBlockEnum
  title?: string
  description?: string
  config: Record<string, unknown>
  subgraph?: OFBlueprintSubgraph
}

export interface OFBlueprintWorkflow {
  version: '2.0'
  workflow: OFBlueprintWorkflowMeta
  nodes: OFBlueprintNode[]
  edges: OFBlueprintEdge[]
}

export interface OFBlueprintValidationIssue {
  level: 'error'
  path: string
  message: string
}

export interface OFBlueprintValidationResult {
  valid: boolean
  issues: OFBlueprintValidationIssue[]
}

export interface OFBlueprintTextLocation {
  line: number
  column: number
  endLine: number
  endColumn: number
}

export interface OFBlueprintTextDiagnostic extends OFBlueprintTextLocation {
  code: string
  severity: 'error'
  path: string
  message: string
  context?: string
}

export interface OFBlueprintSectionEntryAst {
  key: string
  value: unknown
  location: OFBlueprintTextLocation
}

export interface OFBlueprintSectionAst {
  name: string
  entries: OFBlueprintSectionEntryAst[]
  location: OFBlueprintTextLocation
}

export interface OFBlueprintSectionDslAst {
  version: '2.0'
  format: 'oft/1'
  sections: OFBlueprintSectionAst[]
}

// 继续沿用 text-dsl 的类型名，避免上层调用点大面积改名。
export type OFBlueprintTextAst = OFBlueprintSectionDslAst

export interface OFBlueprintTextParseResult {
  ast: OFBlueprintTextAst | null
  diagnostics: OFBlueprintTextDiagnostic[]
  valid: boolean
}

export interface OFBlueprintTextCompileResult extends OFBlueprintTextParseResult {
  blueprint: OFBlueprintWorkflow | null
  runnable: import('../contract').OFRunnableWorkflow | null
}
