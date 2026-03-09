import type {
  OFAuthoringDefaultRecommendation,
  OFInvariantContract,
  OFNode,
  OFNodeAuthoringContract,
  OFWorkflowAuthoringContract
} from '@shared/Orchestraflow-types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { BaseNode } from '../nodes/base-node'
import { EndNode } from '../nodes/end-node'
import { IfElseNode } from '../nodes/if-else-node'
import { IterationNode } from '../nodes/iteration-node'
import { IterationStartNode } from '../nodes/iteration-start-node'
import { LLMNode } from '../nodes/llm-node'
import { LoopNode } from '../nodes/loop-node'
import { LoopStartNode } from '../nodes/loop-start-node'
import { StartNode } from '../nodes/start-node'
import { VariableAssignNode } from '../nodes/variable-assign-node'
import { VariableStore } from '../services/variable-store'

type RuntimeNodeConstructor = new (node: OFNode, variableStore: VariableStore) => BaseNode

/**
 * OrchestraFlow 节点暴露元数据的单一事实来源。
 *
 * 长期不变量：
 * - 运行时节点创建必须能从这里解析到每一个可执行节点。
 * - AI schema 导出必须以这里为准描述节点能力。
 * - 新节点类型在被视为“完成”之前，必须先注册到这里。
 */
export interface OFRuntimeNodeDescriptor {
  type: OFBlockEnum
  title: string
  category: 'start' | 'llm' | 'logic' | 'end' | 'internal'
  summary: string
  internal?: boolean
  ai_exposed: boolean
  contract: OFNodeAuthoringContract
  runtimeCtor: RuntimeNodeConstructor
}

const makeInvariant = (
  id: string,
  scope: OFInvariantContract['scope'],
  summary: string
): OFInvariantContract => ({
  id,
  level: 'error',
  scope,
  summary
})

const RUNTIME_NODE_DESCRIPTORS: OFRuntimeNodeDescriptor[] = [
  {
    type: OFBlockEnum.Start,
    title: '开始',
    category: 'start',
    summary: '定义工作流输入变量。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.Start,
      title: '开始',
      ai_exposed: true,
      author_required_fields: ['data.input.variables'],
      compiler_injected_fields: [],
      runtime_invariants: [],
      produced_outputs: ['input.variables[*].variable'],
      notes: ['开始节点把输入变量原样写入变量存储。']
    },
    runtimeCtor: StartNode
  },
  {
    type: OFBlockEnum.LLM,
    title: 'llm',
    category: 'llm',
    summary: '调用模型，支持 prompt_template 和 structured_output。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.LLM,
      title: 'llm',
      ai_exposed: true,
      author_required_fields: [
        'data.model.provider',
        'data.model.name',
        'data.structured_output.enabled'
      ],
      compiler_injected_fields: ['data.output.variables'],
      runtime_invariants: [],
      produced_outputs: ['llmoutput', 'structured_output(enabled=true)'],
      notes: ['LLM 节点输出变量由系统按节点命名空间自动派生。']
    },
    runtimeCtor: LLMNode
  },
  {
    type: OFBlockEnum.IfElse,
    title: '条件分支',
    category: 'logic',
    summary: '按条件选择分支 handle。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.IfElse,
      title: '条件分支',
      ai_exposed: true,
      author_required_fields: ['data.cases', 'data.elseCase'],
      compiler_injected_fields: [],
      runtime_invariants: [
        makeInvariant(
          'ifelse-edge-source-handle-match-branch',
          'edge',
          'IfElse 出边的 sourceHandle 必须匹配 case.handleId 或 elseCase.handleId。'
        )
      ],
      produced_outputs: ['matchedHandleId', 'matchedLabel', 'caseEvaluations'],
      notes: ['IfElse 节点通过 control.selectedSourceHandleIds 驱动后续边选择。']
    },
    runtimeCtor: IfElseNode
  },
  {
    type: OFBlockEnum.Iteration,
    title: '迭代',
    category: 'logic',
    summary: '对数组逐项执行子图，内部自动注入 iteration-start。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.Iteration,
      title: '迭代',
      ai_exposed: true,
      author_required_fields: ['data.iterator_selector', 'data.subgraph', 'data.output_selector'],
      compiler_injected_fields: [
        'data.start_node_id',
        'data.subgraph.viewport',
        'data.subgraph.nodes[iteration-start]',
        'data.output.variables'
      ],
      runtime_invariants: [
        makeInvariant(
          'iteration-single-start-node',
          'subgraph',
          'Iteration 子图必须且只能包含一个 iteration-start 节点。'
        ),
        makeInvariant(
          'iteration-start-node-id-match',
          'node',
          'Iteration.start_node_id 必须指向该唯一的 iteration-start 节点。'
        ),
        makeInvariant(
          'iteration-subgraph-no-container',
          'subgraph',
          'Iteration 子图内禁止再嵌套 iteration 或 loop。'
        )
      ],
      produced_outputs: ['result'],
      notes: ['子图边必须显式填写 handle。', '迭代输出由系统按 result 变量派生。']
    },
    runtimeCtor: IterationNode
  },
  {
    type: OFBlockEnum.IterationStart,
    title: '迭代开始',
    category: 'internal',
    summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
    internal: true,
    ai_exposed: false,
    contract: {
      type: OFBlockEnum.IterationStart,
      title: '迭代开始',
      internal: true,
      ai_exposed: false,
      author_required_fields: [],
      compiler_injected_fields: ['data.input.variables', 'parentNode', 'extent'],
      runtime_invariants: [],
      produced_outputs: ['item', 'index', 'length'],
      notes: ['内部开始节点由编译器/系统维护，作者不应手写。']
    },
    runtimeCtor: IterationStartNode
  },
  {
    type: OFBlockEnum.Loop,
    title: '循环',
    category: 'logic',
    summary: '执行固定次数循环子图，内部自动注入 loop-start。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.Loop,
      title: '循环',
      ai_exposed: true,
      author_required_fields: ['data.loop_count', 'data.loop_variables', 'data.subgraph'],
      compiler_injected_fields: [
        'data.start_node_id',
        'data.subgraph.viewport',
        'data.subgraph.nodes[loop-start]',
        'data.output.variables'
      ],
      runtime_invariants: [
        makeInvariant(
          'loop-single-start-node',
          'subgraph',
          'Loop 子图必须且只能包含一个 loop-start 节点。'
        ),
        makeInvariant(
          'loop-start-node-id-match',
          'node',
          'Loop.start_node_id 必须指向该唯一的 loop-start 节点。'
        ),
        makeInvariant(
          'loop-subgraph-no-container',
          'subgraph',
          'Loop 子图内禁止再嵌套 iteration 或 loop。'
        )
      ],
      produced_outputs: ['result', 'loop_variables[*].variable'],
      notes: ['循环输出由系统统一汇总为 result 和循环变量命名空间。']
    },
    runtimeCtor: LoopNode
  },
  {
    type: OFBlockEnum.LoopStart,
    title: '循环开始',
    category: 'internal',
    summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
    internal: true,
    ai_exposed: false,
    contract: {
      type: OFBlockEnum.LoopStart,
      title: '循环开始',
      internal: true,
      ai_exposed: false,
      author_required_fields: [],
      compiler_injected_fields: ['data.input.variables', 'parentNode', 'extent'],
      runtime_invariants: [],
      produced_outputs: ['loop_variables[*].variable', 'index', 'loop_count'],
      notes: ['内部开始节点由编译器/系统维护，作者不应手写。']
    },
    runtimeCtor: LoopStartNode
  },
  {
    type: OFBlockEnum.VariableAssign,
    title: '变量赋值',
    category: 'end',
    summary: '把变量或常量写入命名空间输出。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.VariableAssign,
      title: '变量赋值',
      ai_exposed: true,
      author_required_fields: ['data.rules'],
      compiler_injected_fields: ['data.output.variables'],
      runtime_invariants: [],
      produced_outputs: ['rules[*].target_variable'],
      notes: ['变量赋值节点输出变量由规则目标变量自动派生。']
    },
    runtimeCtor: VariableAssignNode
  },
  {
    type: OFBlockEnum.End,
    title: '结束',
    category: 'end',
    summary: '映射最终输出变量。',
    ai_exposed: true,
    contract: {
      type: OFBlockEnum.End,
      title: '结束',
      ai_exposed: true,
      author_required_fields: ['data.output.variables'],
      compiler_injected_fields: [],
      runtime_invariants: [],
      produced_outputs: ['data.output.variables[*].variable'],
      notes: ['结束节点通过 value_selector 从变量存储中提取最终输出。']
    },
    runtimeCtor: EndNode
  }
]

const WORKFLOW_AUTHORING_CONTRACT: OFWorkflowAuthoringContract = {
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
    makeInvariant('selector-non-empty', 'selector', '所有 selector 必须是至少 1 段的非空字符串数组。'),
    makeInvariant('edge-explicit-handle', 'edge', '根图和子图边都必须显式写 sourceHandle / targetHandle。'),
    makeInvariant('root-graph-no-internal-start', 'workflow', '根图禁止出现 iteration-start 或 loop-start。')
  ],
  nodes: RUNTIME_NODE_DESCRIPTORS.map((item) => item.contract)
}

const WORKFLOW_AUTHORING_DEFAULTS: OFAuthoringDefaultRecommendation[] = [
  {
    path: 'graph.nodes[start].data.input.variables[*].default',
    kind: 'recommended',
    value: 'example text',
    summary: '为开始节点输入变量补 default，可让导入后的工作流直接运行，再由用户微调。',
    omit_when: '该输入变量仅应由用户在每次运行前手动输入，且不应预填。'
  },
  {
    path: 'graph.nodes[start].data.input.variables[string].default',
    kind: 'example',
    value: 'batch',
    summary: 'string 输入变量使用非空短字符串作为可运行示例值。'
  },
  {
    path: 'graph.nodes[start].data.input.variables[number].default',
    kind: 'example',
    value: 3,
    summary: 'number 输入变量使用真实数字，避免写成字符串。'
  },
  {
    path: 'graph.nodes[start].data.input.variables[boolean].default',
    kind: 'example',
    value: false,
    summary: 'boolean 输入变量直接写 true/false。'
  },
  {
    path: 'graph.nodes[start].data.input.variables[array].default',
    kind: 'example',
    value: ['sample-item-1', 'sample-item-2'],
    summary: 'array 输入变量写真实 JSON 数组，不要写成字符串化 JSON。'
  },
  {
    path: 'graph.nodes[start].data.input.variables[object].default',
    kind: 'example',
    value: { topic: 'demo', priority: 1 },
    summary: 'object 输入变量写真实 JSON 对象，不要写成字符串化 JSON。'
  }
]

export function getOFRuntimeNodeDescriptors(): OFRuntimeNodeDescriptor[] {
  return RUNTIME_NODE_DESCRIPTORS.map((item) => ({
    ...item,
    contract: {
      ...item.contract,
      author_required_fields: [...item.contract.author_required_fields],
      compiler_injected_fields: [...item.contract.compiler_injected_fields],
      runtime_invariants: [...item.contract.runtime_invariants],
      produced_outputs: [...item.contract.produced_outputs],
      notes: [...item.contract.notes]
    }
  }))
}

export function getOFRuntimeNodeDescriptor(type: OFBlockEnum): OFRuntimeNodeDescriptor {
  const descriptor = RUNTIME_NODE_DESCRIPTORS.find((item) => item.type === type)
  if (!descriptor) {
    throw new Error(`Unknown OrchestraFlow node descriptor: ${type}`)
  }
  return descriptor
}

export function getOFWorkflowAuthoringContract(): OFWorkflowAuthoringContract {
  return {
    ...WORKFLOW_AUTHORING_CONTRACT,
    global_fields: [...WORKFLOW_AUTHORING_CONTRACT.global_fields],
    global_invariants: [...WORKFLOW_AUTHORING_CONTRACT.global_invariants],
    nodes: getOFRuntimeNodeDescriptors().map((item) => item.contract)
  }
}

export function getOFWorkflowAuthoringDefaults(): OFAuthoringDefaultRecommendation[] {
  return WORKFLOW_AUTHORING_DEFAULTS.map((item) => ({
    ...item,
    value:
      item.value && typeof item.value === 'object'
        ? JSON.parse(JSON.stringify(item.value))
        : item.value
  }))
}

export function createRuntimeNodeByDescriptor(
  node: OFNode,
  variableStore: VariableStore
): BaseNode {
  const RuntimeNode = getOFRuntimeNodeDescriptor(node.data.type).runtimeCtor
  return new RuntimeNode(node, variableStore)
}
