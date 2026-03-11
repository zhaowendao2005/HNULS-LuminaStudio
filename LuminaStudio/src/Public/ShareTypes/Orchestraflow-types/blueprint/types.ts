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
