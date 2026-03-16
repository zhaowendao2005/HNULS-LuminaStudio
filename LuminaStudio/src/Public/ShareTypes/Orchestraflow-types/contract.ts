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
import type { OFNodeAuthoringToken, OFNodeRuntimeInvariant } from './node-definition'
import { listOFMechanismDefinitions, resolveOFMechanismDefinition } from './mechanisms'
import { listOFAuthoringNodeDefinitions } from './node-definition-registry'

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
  // contract 层现在只表达“作者态 + LLM 安全暴露”的摘要，
  // 不再把运行层枚举值直接当成作者 token。
  type: OFNodeAuthoringToken
  title: string
  author_required_fields: string[]
  compiler_injected_fields: string[]
  runtime_invariants: OFInvariantContract[]
  produced_outputs: string[]
  notes: string[]
}

export interface OFWorkflowAuthoringContract {
  version: '3.0'
  format: 'orchestraflow-authoring-toml'
  root_type: 'OFWorkflowAuthoringToml'
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

export function assertOFRunnableWorkflow(value: unknown): OFRunnableWorkflow {
  return value as OFRunnableWorkflow
}

// 下面这些 OFRunnable* 类型仍然属于固定运行层：
// 这层继续服务 compiler/runtime/持久化，不参与作者态 token 的定义。

function cloneFieldContract(field: OFFieldContract): OFFieldContract {
  return { ...field }
}

function cloneInvariantContract(
  invariant: OFInvariantContract | OFNodeRuntimeInvariant
): OFInvariantContract {
  return { ...invariant }
}

export function buildOFWorkflowAuthoringContract(): OFWorkflowAuthoringContract {
  const syntaxMechanism = resolveOFMechanismDefinition('blueprint-syntax')
  const selectorMechanism = resolveOFMechanismDefinition('selector-ref')
  const edgeMechanism = resolveOFMechanismDefinition('edge-handle')

  return {
    version: '3.0',
    format: 'orchestraflow-authoring-toml',
    root_type: 'OFWorkflowAuthoringToml',
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
    nodes: listOFAuthoringNodeDefinitions().map((definition) => ({
      type: definition.authoring.token,
      title: definition.authoring.title,
      author_required_fields: [...definition.authoring.toml.requiredFields],
      compiler_injected_fields: [...(definition.runtime.system_managed_fields || [])],
      runtime_invariants: (definition.runtime.runtime_invariants || []).map(cloneInvariantContract),
      produced_outputs: [...definition.authoring.description.outputArtifacts],
      notes: [
        definition.authoring.description.summary,
        definition.authoring.mainPrompt,
        ...(definition.authoring.description.notes || []),
        ...definition.authoring.errorGuidance
      ]
    }))
  }
}

export function getOFWorkflowAuthoringContract(): OFWorkflowAuthoringContract {
  return buildOFWorkflowAuthoringContract()
}
