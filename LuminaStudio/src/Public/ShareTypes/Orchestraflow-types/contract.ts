import type {
  OFEdge,
  OFEndNodeData,
  OFIfElseNodeData,
  OFIterationNodeData,
  OFIterationStartNodeData,
  OFLLMNodeData,
  OFLoopNodeData,
  OFLoopStartNodeData,
  OFNode,
  OFNodeInput,
  OFStartNodeData,
  OFSubWorkflowGraph,
  OFVariableAssignNodeData,
  OFWorkflow,
  OFWorkflowGraph
} from './core-types'
import { OFBlockEnum } from './core-types'

export type OFFieldSource = 'author' | 'compiler' | 'runtime'

export interface OFFieldContract {
  path: string
  source: OFFieldSource
  required: boolean
  summary?: string
}

export interface OFInvariantContract {
  id: string
  level: 'error'
  scope: 'workflow' | 'node' | 'subgraph' | 'edge' | 'selector'
  summary: string
}

export interface OFSelectorContract {
  representation: 'store-key-array'
  first_segment: 'store-key'
  min_items: 1
  nested_path_supported: boolean
  dots_allowed_in_first_segment: true
  empty_segments_allowed: false
  examples: string[][]
}

export interface OFEdgeContract {
  explicit_handles_required: true
  default_target_handle: 'target'
  default_source_handle: 'source'
  ifelse_source_handle_rule: 'case.handleId-or-elseCase.handleId'
}

export interface OFNodeAuthoringContract {
  type: OFBlockEnum
  title: string
  internal?: boolean
  ai_exposed: boolean
  author_required_fields: string[]
  compiler_injected_fields: string[]
  runtime_invariants: OFInvariantContract[]
  produced_outputs: string[]
  notes: string[]
}

export interface OFWorkflowAuthoringContract {
  version: '1.0'
  format: 'orchestraflow-runnable-workflow'
  root_type: 'OFRunnableWorkflow'
  selector_contract: OFSelectorContract
  edge_contract: OFEdgeContract
  global_fields: OFFieldContract[]
  global_invariants: OFInvariantContract[]
  nodes: OFNodeAuthoringContract[]
}

export type OFRunnableEdge = Omit<OFEdge, 'sourceHandle' | 'targetHandle'> & {
  sourceHandle: string
  targetHandle: string
}

export type OFRunnableIterationStartNodeData = Omit<OFIterationStartNodeData, 'input'> & {
  input: OFNodeInput
}

export type OFRunnableLoopStartNodeData = Omit<OFLoopStartNodeData, 'input'> & {
  input: OFNodeInput
}

export type OFRunnableIterationNodeData = Omit<OFIterationNodeData, 'subgraph'> & {
  subgraph: OFRunnableSubWorkflowGraph
}

export type OFRunnableLoopNodeData = Omit<OFLoopNodeData, 'subgraph'> & {
  subgraph: OFRunnableSubWorkflowGraph
}

export type OFRunnableRootNodeData =
  | OFStartNodeData
  | OFLLMNodeData
  | OFIfElseNodeData
  | OFRunnableIterationNodeData
  | OFRunnableLoopNodeData
  | OFVariableAssignNodeData
  | OFEndNodeData

export type OFRunnableSubgraphNodeData =
  | OFRunnableIterationStartNodeData
  | OFRunnableLoopStartNodeData
  | OFLLMNodeData
  | OFIfElseNodeData
  | OFVariableAssignNodeData
  | OFEndNodeData

export type OFRunnableRootNode = Omit<OFNode, 'data' | 'parentNode' | 'extent'> & {
  data: OFRunnableRootNodeData
}

export type OFRunnableSubgraphNode = Omit<OFNode, 'data' | 'parentNode' | 'extent'> & {
  parentNode: string
  extent: 'parent'
  data: OFRunnableSubgraphNodeData
}

export type OFRunnableSubWorkflowGraph = Omit<
  OFSubWorkflowGraph,
  'nodes' | 'edges' | 'viewport'
> & {
  nodes: OFRunnableSubgraphNode[]
  edges: OFRunnableEdge[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

export type OFRunnableWorkflowGraph = Omit<OFWorkflowGraph, 'nodes' | 'edges'> & {
  nodes: OFRunnableRootNode[]
  edges: OFRunnableEdge[]
}

export type OFRunnableWorkflow = Omit<OFWorkflow, 'graph'> & {
  graph: OFRunnableWorkflowGraph
}
