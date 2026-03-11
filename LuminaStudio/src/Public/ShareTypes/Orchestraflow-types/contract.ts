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
import type { OFBlockEnum } from './core-types'
import { listOFMechanismDefinitions, resolveOFMechanismDefinition } from './mechanisms'
import { listOFNodeDefinitions } from './node-definition-registry'

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
  scope: 'workflow' | 'node' | 'subgraph' | 'edge' | 'selector' | 'variable'
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
  version: '2.0'
  format: 'orchestraflow-blueprint-workflow'
  root_type: 'OFBlueprintWorkflow'
  selector_contract: OFSelectorContract
  edge_contract: OFEdgeContract
  global_fields: OFFieldContract[]
  global_invariants: OFInvariantContract[]
  nodes: OFNodeAuthoringContract[]
}

export type OFRunnableEdge = Omit<
  OFEdge,
  'sourceHandle' | 'targetHandle' | 'source_port_id' | 'target_port_id'
> & {
  source_port_id: string
  target_port_id: string
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

function cloneFieldContract(field: OFFieldContract): OFFieldContract {
  return { ...field }
}

function cloneInvariantContract(invariant: OFInvariantContract): OFInvariantContract {
  return { ...invariant }
}

export function buildOFWorkflowAuthoringContract(): OFWorkflowAuthoringContract {
  const syntaxMechanism = resolveOFMechanismDefinition('blueprint-syntax')
  const selectorMechanism = resolveOFMechanismDefinition('selector-ref')
  const edgeMechanism = resolveOFMechanismDefinition('edge-handle')

  return {
    version: '2.0',
    format: 'orchestraflow-blueprint-workflow',
    root_type: 'OFBlueprintWorkflow',
    selector_contract: {
      ...(selectorMechanism.selector_contract as OFSelectorContract)
    },
    edge_contract: {
      ...(edgeMechanism.edge_contract as OFEdgeContract)
    },
    global_fields: (syntaxMechanism.global_fields || []).map(cloneFieldContract),
    global_invariants: listOFMechanismDefinitions().flatMap((mechanism) =>
      (mechanism.global_invariants || []).map(cloneInvariantContract)
    ),
    nodes: listOFNodeDefinitions().map((definition) => ({
      ...definition.authoring.contract,
      author_required_fields: [...definition.authoring.contract.author_required_fields],
      compiler_injected_fields: [...definition.authoring.contract.compiler_injected_fields],
      runtime_invariants:
        definition.authoring.contract.runtime_invariants.map(cloneInvariantContract),
      produced_outputs: [...definition.authoring.contract.produced_outputs],
      notes: [...definition.authoring.contract.notes]
    }))
  }
}

export function getOFWorkflowAuthoringContract(): OFWorkflowAuthoringContract {
  return buildOFWorkflowAuthoringContract()
}
