import type { OFBlockEnum } from './index'
import type { OFRunnableWorkflow, OFWorkflowAuthoringContract } from './contract'

/**
 * 代码即文档：
 * - 提供给外部 AI 的最终目标是可直接落盘运行的 OFWorkflow JSON。
 * - 内部可以存在 DSL / compiler 等辅助层，但导出的 bundle 必须面向最终持久化格式。
 */

export interface OFAIDslWorkflowMeta {
  name: string
  description?: string
  author?: string
}

export interface OFAIDslEdgeEndpoint {
  node: string
  handle?: string
}

export interface OFAIDslEdge {
  from: OFAIDslEdgeEndpoint
  to: OFAIDslEdgeEndpoint
}

export interface OFAIDslSubgraph {
  nodes: OFAIDslNode[]
  edges: OFAIDslEdge[]
}

export interface OFAIDslNode {
  id: string
  type: OFBlockEnum
  title?: string
  description?: string
  config: Record<string, any>
  subgraph?: OFAIDslSubgraph
}

export interface OFAIDslWorkflow {
  version: '1.0'
  workflow: OFAIDslWorkflowMeta
  nodes: OFAIDslNode[]
  edges: OFAIDslEdge[]
}

export interface OFAISchemaNodeSummary {
  type: OFBlockEnum
  category: string
  title: string
  summary: string
  internal?: boolean
}

export type OFAuthoringDefaultKind = 'recommended' | 'example'

export interface OFAuthoringDefaultRecommendation {
  path: string
  kind: OFAuthoringDefaultKind
  value: string | number | boolean | Record<string, any> | any[] | null
  summary: string
  omit_when?: string
}

export interface OFAISchemaBundle {
  version: '1.0'
  format: 'orchestraflow-runnable-workflow'
  generated_at: string
  nodes: OFAISchemaNodeSummary[]
  authoring_contract: OFWorkflowAuthoringContract
  authoring_defaults: OFAuthoringDefaultRecommendation[]
  schema: Record<string, any>
  example: OFRunnableWorkflow
  annotated_workflow_jsonc: string
  prompt_markdown: string
  bundled_markdown: string
}
