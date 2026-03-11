import {
  buildOFCommonNodeShape,
  createOFPortSpec,
  defineContainerOFNodeDefinition,
  normalizeOFNodeTitle,
  resolveOFNodeOutputNamespace
} from '../node-definition'
import {
  ensureOFSelectableVariables,
  loopInnerStartVariableDefinition,
  loopOutputVariableDefinition
} from '../variable-definition'
import type { OFLoopNodeData, OFLoopStartNodeData, OFNode } from '../core-types'
import { OFBlockEnum, OFVarType } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'

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

function createLoopStartNode(
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
            resolveOFNodeOutputNamespace(loopNodeDefinition, {
              title: loopTitle,
              fallback: loopNodeId
            }) || loopNodeId,
          loopVariables,
          fallbackNodeId: loopNodeId
        })
      }
    } as OFLoopStartNodeData
  }
}

function createDefaultLoopSubgraph(
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

export const loopNodeDefinition = defineContainerOFNodeDefinition<OFLoopNodeData>({
  meta: {
    type: OFBlockEnum.Loop,
    title: '循环',
    summary: '执行固定次数循环子图，内部自动注入 loop-start。',
    category: 'logic',
    kind: 'container',
    vueFlowType: 'loop',
    ai_exposed: true
  },
  spec: {
    ports: [
      createOFPortSpec({ id: 'target', label: '进入', direction: 'input', channel: 'control', required: true }),
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
    }
  },
  authoring: {
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
      produced_outputs: ['result', 'loop_variables[*].variable'],
      notes: ['循环输出由系统统一汇总为 result 和循环变量命名空间。']
    },
    warnings_zh: [
      '`loop_count`、`loop_variables`、`subgraph` 必须同时给全。',
      '`loop_variables` 不能只有变量名，必须给出初始化值或值来源。',
      '`result` 默认按聚合数组输出，不要把 `loop.output.variables[].type` 写成 `object`。',
      '不要手写伪造的 `start_node_id`、`loop-start` 或 `subgraph.viewport`。'
    ],
    selector_policies: ['`loop_variables[*].value_selector` 仅在 `value_type=variable` 时出现。'],
    output_policies: ['循环输出由系统聚合为 `result` 和循环变量命名空间。'],
    omit_rules: ['不要手写内部 start 节点或容器 viewport。']
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFLoopNodeData
      return {
        ...node,
        data: {
          ...data,
          loop_variables: data.loop_variables.map((item) =>
            item.value_type === 'variable' ? omitOFEmptySelector(item, 'value_selector') : item
          ),
          output: {
            ...data.output,
            variables: data.output.variables.map((item) => omitOFNullSchemaFields(item))
          }
        }
      }
    }
  },
  variables: {
    buildRuntimeOutputVariables({ title, loopVariables, nodeId }) {
      return buildLoopOutputs(title, loopVariables || [], nodeId || title)
    },
    getSelectableVariables(node) {
      const data = node.data as OFLoopNodeData
      return ensureOFSelectableVariables(data.output?.variables || [])
    }
  },
  editor: {
    createDefaultData({ nodeId, title }) {
      const loopVariables: OFLoopNodeData['loop_variables'] = [
        {
          id: `loop_var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          variable: 'counter',
          label: 'counter',
          type: OFVarType.Number,
          value_type: 'constant',
          value: 0
        }
      ]
      const outputNamespace =
        resolveOFNodeOutputNamespace(loopNodeDefinition, {
          nodeId,
          title,
          fallback: 'loop'
        }) || 'loop'
      return {
        title,
        desc: '',
        type: OFBlockEnum.Loop,
        output_namespace: outputNamespace,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        loop_count: 10,
        loop_variables: loopVariables,
        break_conditions: [],
        logical_operator: 'and',
        start_node_id: `${nodeId}-loop-start`,
        subgraph: createDefaultLoopSubgraph(nodeId, title, loopVariables),
        output: {
          variables: buildLoopOutputs(outputNamespace, loopVariables, nodeId)
        }
      }
    },
    normalizeData({ node, helpers }) {
      const data = node.data as Partial<OFLoopNodeData>
      const title = normalizeOFNodeTitle(OFBlockEnum.Loop, data.title)
      const loopVariables = data.loop_variables || []
      const baseSubgraph =
        data.subgraph?.nodes?.length || data.subgraph?.edges?.length
          ? data.subgraph
          : createDefaultLoopSubgraph(node.id, title, loopVariables)

      const normalizedNodes = (baseSubgraph.nodes || []).map((childNode) => {
        const normalizedChildNode = {
          ...JSON.parse(JSON.stringify(childNode)),
          parentNode: childNode.parentNode || node.id,
          extent: childNode.extent || 'parent'
        } as OFNode

        if (
          normalizedChildNode.data.type === OFBlockEnum.LoopStart ||
          normalizedChildNode.data.type === OFBlockEnum.Start
        ) {
          return createLoopStartNode(node.id, title, loopVariables)
        }

        return helpers.normalizeNode(normalizedChildNode)
      })

      const startNode =
        normalizedNodes.find((childNode) => childNode.data.type === OFBlockEnum.LoopStart) ||
        createLoopStartNode(node.id, title, loopVariables)

      const subgraph = {
        nodes: normalizedNodes.some((childNode) => childNode.id === startNode.id)
          ? normalizedNodes.map((childNode) =>
              childNode.id === startNode.id
                ? createLoopStartNode(node.id, title, loopVariables)
                : childNode
            )
          : [startNode, ...normalizedNodes],
        edges: (baseSubgraph.edges || []).map((edge) => JSON.parse(JSON.stringify(edge))),
        viewport: baseSubgraph.viewport || { ...DEFAULT_SUBGRAPH_VIEWPORT }
      }

      const normalized = {
        ...data,
        loop_variables: loopVariables,
        break_conditions: data.break_conditions || [],
        subgraph,
        start_node_id: startNode.id
      } as OFLoopNodeData
      const outputNamespace =
        resolveOFNodeOutputNamespace(loopNodeDefinition, {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: 'loop'
        }) || 'loop'
      normalizeOFRunnableNodeSelectorData(
        OFBlockEnum.Loop,
        normalized as unknown as Record<string, unknown>,
        collectOFSelectorVariableRoots([node])
      )

      return {
        ...buildOFCommonNodeShape(data, title),
        type: OFBlockEnum.Loop,
        output_namespace: outputNamespace,
        width: data.width || DEFAULT_WIDTH,
        height: data.height || DEFAULT_HEIGHT,
        loop_count: Math.max(1, Number(data.loop_count || 10)),
        loop_variables: normalized.loop_variables,
        break_conditions: normalized.break_conditions || [],
        logical_operator: normalized.logical_operator || 'and',
        start_node_id: normalized.start_node_id,
        subgraph,
        output: {
          variables: buildLoopOutputs(outputNamespace, loopVariables, node.id)
        }
      }
    }
  },
  compiler: {
    compileData({ node, compiledId, title, desc, helpers }) {
      const loopVariables = helpers.compileLoopVariables(node.config.loop_variables || [])
      const compiledSubgraph = helpers.compileContainerSubgraph(
        node,
        compiledId,
        title,
        OFBlockEnum.Loop,
        loopVariables
      )
      return {
        title,
        desc,
        type: OFBlockEnum.Loop,
        output_namespace:
          resolveOFNodeOutputNamespace(loopNodeDefinition, {
            nodeId: compiledId,
            title,
            fallback: 'loop'
          }) || 'loop',
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        loop_count: Number(node.config.loop_count || 1),
        loop_variables: loopVariables,
        break_conditions: helpers.compileConditions(node.config.break_conditions || []),
        logical_operator:
          (node.config.logical_operator as OFLoopNodeData['logical_operator']) || 'and',
        start_node_id: `${compiledId}-loop-start`,
        subgraph: compiledSubgraph.graph,
        output: {
          variables: buildLoopOutputs(
            resolveOFNodeOutputNamespace(loopNodeDefinition, {
              nodeId: compiledId,
              title,
              fallback: 'loop'
            }) || 'loop',
            loopVariables,
            compiledId
          )
        }
      }
    }
  }
})
