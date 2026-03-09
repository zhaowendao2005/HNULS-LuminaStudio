import type {
  OFAISchemaNodeSummary,
  OFAuthoringDefaultRecommendation,
  OFWorkflowAuthoringContract
} from '@shared/Orchestraflow-types'
import { cloneOFAuthoringDefaults, listOFNodeDefinitions } from '@shared/Orchestraflow-types'

const WORKFLOW_AUTHORING_CONTRACT_BASE: Omit<OFWorkflowAuthoringContract, 'nodes'> = {
  version: '1.0',
  format: 'orchestraflow-runnable-workflow',
  root_type: 'OFRunnableWorkflow',
  selector_contract: {
    representation: 'store-key-array',
    first_segment: 'store-key',
    min_items: 1,
    nested_path_supported: true,
    dots_allowed_in_first_segment: true,
    empty_segments_allowed: false,
    examples: [['input'], ['node_llm.llmoutput'], ['node_llm.structured_output', 'reason']]
  },
  edge_contract: {
    explicit_handles_required: true,
    default_target_handle: 'target',
    default_source_handle: 'source',
    ifelse_source_handle_rule: 'case.handleId-or-elseCase.handleId'
  },
  global_fields: [
    { path: 'id', source: 'author', required: true },
    { path: 'name', source: 'author', required: true },
    { path: 'author', source: 'author', required: true },
    { path: 'createdAt', source: 'author', required: true },
    { path: 'updatedAt', source: 'author', required: true },
    { path: 'status', source: 'author', required: true },
    { path: 'graph.nodes', source: 'author', required: true },
    { path: 'graph.edges', source: 'author', required: true }
  ],
  global_invariants: [
    {
      id: 'selector-non-empty',
      level: 'error',
      scope: 'selector',
      summary: '所有 selector 必须是至少 1 段的非空字符串数组。'
    },
    {
      id: 'edge-explicit-handle',
      level: 'error',
      scope: 'edge',
      summary: '根图和子图边都必须显式写 sourceHandle / targetHandle。'
    },
    {
      id: 'root-graph-no-internal-start',
      level: 'error',
      scope: 'workflow',
      summary: '根图禁止出现 iteration-start 或 loop-start。'
    }
  ]
}

export function listOFAISchemaNodeSummaries(): OFAISchemaNodeSummary[] {
  return listOFNodeDefinitions().map((definition) => ({
    type: definition.meta.type,
    category: definition.meta.category,
    title: definition.meta.title,
    summary: definition.meta.summary,
    internal: definition.meta.internal
  }))
}

export function getOFWorkflowAuthoringContract(): OFWorkflowAuthoringContract {
  return {
    ...WORKFLOW_AUTHORING_CONTRACT_BASE,
    global_fields: [...WORKFLOW_AUTHORING_CONTRACT_BASE.global_fields],
    global_invariants: [...WORKFLOW_AUTHORING_CONTRACT_BASE.global_invariants],
    nodes: listOFNodeDefinitions().map((definition) => ({
      ...definition.authoring.contract,
      author_required_fields: [...definition.authoring.contract.author_required_fields],
      compiler_injected_fields: [...definition.authoring.contract.compiler_injected_fields],
      runtime_invariants: [...definition.authoring.contract.runtime_invariants],
      produced_outputs: [...definition.authoring.contract.produced_outputs],
      notes: [...definition.authoring.contract.notes]
    }))
  }
}

export function getOFWorkflowAuthoringDefaults(): OFAuthoringDefaultRecommendation[] {
  return cloneOFAuthoringDefaults(
    listOFNodeDefinitions().flatMap((definition) => definition.authoring.defaults || [])
  )
}
