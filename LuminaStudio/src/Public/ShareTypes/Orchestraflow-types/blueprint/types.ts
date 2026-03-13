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

export type OFAuthoringDefaultKind = 'recommended' | 'example'

export interface OFAuthoringDefaultRecommendation {
  path: string
  kind: OFAuthoringDefaultKind
  value: string | number | boolean | Record<string, unknown> | unknown[] | null
  summary: string
  omit_when?: string
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

export type OFBlueprintTextPathSegment = string | number
export type OFBlueprintTextScalarValue = string | number | boolean | null
export type OFBlueprintTextValue =
  | OFBlueprintTextScalarValue
  | Record<string, unknown>
  | unknown[]

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

export interface OFBlueprintTextAssignmentAst {
  kind: 'assignment'
  rawPath: string
  value: OFBlueprintTextValue
  valueKind: 'inline' | 'heredoc-text' | 'heredoc-json'
  target: 'workflow' | 'node'
  targetId: string | null
  pathSegments: OFBlueprintTextPathSegment[]
  location: OFBlueprintTextLocation
}

export interface OFBlueprintTextEdgeAst {
  kind: 'edge'
  fromNodeId: string
  fromHandle: string | null
  toNodeId: string
  toHandle: string | null
  location: OFBlueprintTextLocation
}

export interface OFBlueprintTextNodeAst {
  kind: 'node'
  id: string
  type: string
  assignments: OFBlueprintTextAssignmentAst[]
  subgraph: OFBlueprintTextGraphAst | null
  location: OFBlueprintTextLocation
}

export interface OFBlueprintTextGraphAst {
  nodes: OFBlueprintTextNodeAst[]
  edges: OFBlueprintTextEdgeAst[]
}

export interface OFBlueprintTextAst {
  version: '1.0'
  workflowAssignments: OFBlueprintTextAssignmentAst[]
  graph: OFBlueprintTextGraphAst
}

export interface OFBlueprintTextParseResult {
  ast: OFBlueprintTextAst | null
  diagnostics: OFBlueprintTextDiagnostic[]
  valid: boolean
}

export interface OFBlueprintTextCompileResult extends OFBlueprintTextParseResult {
  blueprint: OFBlueprintWorkflow | null
  runnable: import('../contract').OFRunnableWorkflow | null
}
