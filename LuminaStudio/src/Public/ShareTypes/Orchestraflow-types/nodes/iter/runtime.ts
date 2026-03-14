import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFIterationNodeData, OFIterationStartNodeData, OFNode } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { createOFPortSpec, resolveOFNodeOutputNamespace } from '../../node-definition'
import {
  ensureOFSelectableVariables,
  iterationInnerStartVariableDefinition,
  iterationOutputVariableDefinition
} from '../../variable-definition'

const DEFAULT_SUBGRAPH_VIEWPORT = { x: 0, y: 0, zoom: 1 }
const DEFAULT_WIDTH = 650
const DEFAULT_HEIGHT = 417

function buildIterationOutputs(namespace: string, nodeId: string) {
  return iterationOutputVariableDefinition.build({
    namespace,
    fallbackNodeId: nodeId
  })
}

export function createIterationStartNode(iterationNodeId: string, iterationTitle: string): OFNode {
  return {
    id: `${iterationNodeId}-iteration-start`,
    type: 'iteration-start',
    parentNode: iterationNodeId,
    extent: 'parent',
    position: { x: 24, y: 82 },
    data: {
      title: '迭代开始',
      desc: '迭代开始',
      type: OFBlockEnum.IterationStart,
      input: {
        variables: iterationInnerStartVariableDefinition.build({
          namespace:
            resolveOFNodeOutputNamespace(
              { runtime: iterationNodeRuntimeDefinition },
              {
                title: iterationTitle,
                fallback: iterationNodeId
              }
            ) || iterationNodeId,
          fallbackNodeId: iterationNodeId
        })
      }
    } as OFIterationStartNodeData
  }
}

export function createDefaultIterationSubgraph(
  iterationNodeId: string,
  iterationTitle: string
): OFIterationNodeData['subgraph'] {
  return {
    nodes: [createIterationStartNode(iterationNodeId, iterationTitle)],
    edges: [],
    viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
  }
}

export const iterationNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'container' } = {
  type: OFBlockEnum.Iteration,
  title: '迭代',
  summary: '对数组逐项执行子图，内部自动注入 iteration-start。',
  category: 'logic',
  kind: 'container',
  vueFlowType: 'iteration',
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
    'data.subgraph.nodes[iteration-start]',
    'data.output.variables'
  ],
  side_effects: [{ id: 'spawn-iteration-subgraph', summary: '逐项执行子图，并聚合 result 输出。' }],
  output_namespace: {
    source: 'system-stable',
    editable: true,
    summary: '迭代输出使用稳定命名空间；旧工作流会沿用已有值，新节点默认按 nodeId 生成。'
  },
  container: {
    internal_start_node_type: OFBlockEnum.IterationStart,
    managed_subgraph: true,
    default_viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
  },
  runtime_invariants: [
    {
      id: 'iteration-single-start-node',
      level: 'error',
      scope: 'subgraph',
      summary: 'Iteration 子图必须且只能包含一个 iteration-start 节点。'
    },
    {
      id: 'iteration-start-node-id-match',
      level: 'error',
      scope: 'node',
      summary: 'Iteration.start_node_id 必须指向该唯一的 iteration-start 节点。'
    },
    {
      id: 'iteration-subgraph-no-container',
      level: 'error',
      scope: 'subgraph',
      summary: 'Iteration 子图内禁止再嵌套 iteration 或 loop。'
    }
  ],
  buildRuntimeOutputVariables({ title, nodeId }) {
    return buildIterationOutputs(title, nodeId || title)
  },
  getSelectableVariables(node) {
    const data = node.data as OFIterationNodeData
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}

export const ITERATION_NODE_DEFAULT_WIDTH = DEFAULT_WIDTH
export const ITERATION_NODE_DEFAULT_HEIGHT = DEFAULT_HEIGHT
export const ITERATION_NODE_DEFAULT_VIEWPORT = DEFAULT_SUBGRAPH_VIEWPORT
