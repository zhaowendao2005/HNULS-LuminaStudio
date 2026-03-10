import type { OFBlockEnum, OFNode, OFWorkflowGraph } from './core-types'

export interface OFGenerationNodeSnapshot {
  id: string
  type: OFBlockEnum
  title: string
  output_namespace: string
  node: OFNode
}

export interface OFGenerationGraphState extends OFWorkflowGraph {
  version: number
  checkpoints_version: number
  node_snapshots: OFGenerationNodeSnapshot[]
}

export interface OFGenerationGraphSummary {
  node_count: number
  edge_count: number
  namespaces: string[]
  node_types: Record<string, number>
}

export function createEmptyOFGenerationGraphState(): OFGenerationGraphState {
  return {
    version: 1,
    checkpoints_version: 0,
    nodes: [],
    edges: [],
    node_snapshots: []
  }
}
