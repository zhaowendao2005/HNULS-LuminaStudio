import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFLoopNodeData, OFLoopStartNodeData, OFNode } from '../../core-types'
import { OFBlockEnum, OFVarType } from '../../core-types'
import { createOFPortSpec, resolveOFNodeOutputNamespace } from '../../node-definition'
import {
  ensureOFSelectableVariables,
  loopInnerStartVariableDefinition,
  loopOutputVariableDefinition
} from '../../variable-definition'

const DEFAULT_SUBGRAPH_VIEWPORT = { x: 0, y: 0, zoom: 1 }
const DEFAULT_WIDTH = 650
const DEFAULT_HEIGHT = 417

function buildLoopOutputs(
  namespace: string,
  loopVariables: OFLoopNodeData['loop_variables'],
  nodeId: string
) {
  return loopOutputVariableDefinition.build({
    namespace,
    loopVariables,
    fallbackNodeId: nodeId
  })
}

export function createLoopStartNode(
  loopNodeId: string,
  loopTitle: string,
  loopVariables: OFLoopNodeData['loop_variables']
): OFNode {
  return {
    id: `${loopNodeId}-loop-start`,
    type: 'loop-start',
    parentNode: loopNodeId,
    extent: 'parent',
    position: { x: 24, y: 82 },
    data: {
      title: '循环开始',
      desc: '循环开始',
      type: OFBlockEnum.LoopStart,
      input: {
        variables: loopInnerStartVariableDefinition.build({
          namespace:
            resolveOFNodeOutputNamespace(
              { runtime: loopNodeRuntimeDefinition },
              {
                title: loopTitle,
                fallback: loopNodeId
              }
            ) || loopNodeId,
          loopVariables,
          fallbackNodeId: loopNodeId
        })
      }
    } as OFLoopStartNodeData
  }
}

export function createDefaultLoopSubgraph(
  loopNodeId: string,
  loopTitle: string,
  loopVariables: OFLoopNodeData['loop_variables']
): OFLoopNodeData['subgraph'] {
  return {
    nodes: [createLoopStartNode(loopNodeId, loopTitle, loopVariables)],
    edges: [],
    viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
  }
}

export const loopNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'container' } = {
  type: OFBlockEnum.Loop,
  title: '循环',
  summary: '执行固定次数循环子图，内部自动注入 loop-start。',
  category: 'logic',
  kind: 'container',
  vueFlowType: 'loop',
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
    createOFPortSpec({ id: 'result', label: '结果', direction: 'output', channel: 'data' })
  ],
  system_managed_fields: [
    'data.start_node_id',
    'data.subgraph.viewport',
    'data.subgraph.nodes[loop-start]',
    'data.output.variables'
  ],
  side_effects: [{ id: 'spawn-loop-subgraph', summary: '按循环次数执行子图并聚合循环输出。' }],
  output_namespace: {
    source: 'system-stable',
    editable: true,
    summary: '循环输出使用稳定命名空间；旧工作流会沿用已有值，新节点默认按 nodeId 生成。'
  },
  container: {
    internal_start_node_type: OFBlockEnum.LoopStart,
    managed_subgraph: true,
    default_viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
  },
  runtime_invariants: [
    {
      id: 'loop-single-start-node',
      level: 'error',
      scope: 'subgraph',
      summary: 'Loop 子图必须且只能包含一个 loop-start 节点。'
    },
    {
      id: 'loop-start-node-id-match',
      level: 'error',
      scope: 'node',
      summary: 'Loop.start_node_id 必须指向该唯一的 loop-start 节点。'
    },
    {
      id: 'loop-subgraph-no-container',
      level: 'error',
      scope: 'subgraph',
      summary: 'Loop 子图内禁止再嵌套 iteration 或 loop。'
    }
  ],
  buildRuntimeOutputVariables({ title, loopVariables, nodeId }) {
    return buildLoopOutputs(title, loopVariables || [], nodeId || title)
  },
  getSelectableVariables(node) {
    const data = node.data as OFLoopNodeData
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}

export function createDefaultLoopVariables(): OFLoopNodeData['loop_variables'] {
  return [
    {
      id: `loop_var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      variable: 'counter',
      label: 'counter',
      type: OFVarType.Number,
      value_type: 'constant',
      value: 0
    }
  ]
}

export const LOOP_NODE_DEFAULT_WIDTH = DEFAULT_WIDTH
export const LOOP_NODE_DEFAULT_HEIGHT = DEFAULT_HEIGHT
export const LOOP_NODE_DEFAULT_VIEWPORT = DEFAULT_SUBGRAPH_VIEWPORT
