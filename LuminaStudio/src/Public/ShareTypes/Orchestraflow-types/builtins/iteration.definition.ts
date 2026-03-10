import {
  buildOFCommonNodeShape,
  defineContainerOFNodeDefinition,
  normalizeOFNodeTitle
} from '../node-definition'
import {
  ensureOFSelectableVariables,
  iterationInnerStartVariableDefinition,
  iterationOutputVariableDefinition
} from '../variable-definition'
import type { OFIterationNodeData, OFIterationStartNodeData, OFNode } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFNullSchemaFields } from './helpers'
import {
  collectOFSelectorVariableRoots,
  getOFSelectorFromRef,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'

const DEFAULT_SUBGRAPH_VIEWPORT = { x: 0, y: 0, zoom: 1 }
const DEFAULT_WIDTH = 650
const DEFAULT_HEIGHT = 417

function buildIterationOutputs(title: string, nodeId: string) {
  return iterationOutputVariableDefinition.build({
    namespace: title,
    fallbackNodeId: nodeId
  })
}

function createIterationStartNode(iterationNodeId: string, iterationTitle: string): OFNode {
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
          namespace: iterationTitle,
          fallbackNodeId: iterationNodeId
        })
      }
    } as OFIterationStartNodeData
  }
}

function createDefaultIterationSubgraph(
  iterationNodeId: string,
  iterationTitle: string
): OFIterationNodeData['subgraph'] {
  return {
    nodes: [createIterationStartNode(iterationNodeId, iterationTitle)],
    edges: [],
    viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
  }
}

export const iterationNodeDefinition = defineContainerOFNodeDefinition<OFIterationNodeData>({
  meta: {
    type: OFBlockEnum.Iteration,
    title: '迭代',
    summary: '对数组逐项执行子图，内部自动注入 iteration-start。',
    category: 'logic',
    kind: 'container',
    vueFlowType: 'iteration',
    ai_exposed: true
  },
  authoring: {
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
      produced_outputs: ['result'],
      notes: ['子图边必须显式填写 handle。', '迭代输出由系统按 result 变量派生。']
    },
    warnings_zh: [
      '`iterator_selector` 必须非空；`output_selector` 可省略但不能写空数组。',
      '不要手写伪造的 `start_node_id`、`iteration-start` 或 `subgraph.viewport`。'
    ],
    system_managed_fields: [
      'data.start_node_id',
      'data.subgraph.viewport',
      'data.subgraph.nodes[iteration-start]',
      'data.output.variables'
    ],
    selector_policies: [
      '`iterator_selector` 必须非空。',
      '`output_selector` 可省略，但出现时不能是空数组。'
    ],
    output_policies: ['迭代输出由系统派生 `result`。'],
    omit_rules: ['不要手写内部 start 节点或容器 viewport。']
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFIterationNodeData
      return {
        ...node,
        data: {
          ...data,
          output_selector: data.output_selector,
          branch_output_selectors: (data.branch_output_selectors || []).filter(
            (item) => Array.isArray(item.output_selector) && item.output_selector.length > 0
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
    buildRuntimeOutputVariables({ title, nodeId }) {
      return buildIterationOutputs(title, nodeId || title)
    },
    getSelectableVariables(node) {
      const data = node.data as OFIterationNodeData
      return ensureOFSelectableVariables(data.output?.variables || [])
    }
  },
  editor: {
    createDefaultData({ nodeId, title }) {
      return {
        title,
        desc: '',
        type: OFBlockEnum.Iteration,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        iterator_selector: [],
        output_selector: [],
        branch_output_selectors: [],
        start_node_id: `${nodeId}-iteration-start`,
        subgraph: createDefaultIterationSubgraph(nodeId, title),
        parallel_mode: 'sequential',
        parallel_nums: 1,
        error_handle_mode: 'terminated',
        flatten_output: true,
        output: {
          variables: buildIterationOutputs(title, nodeId)
        }
      }
    },
    normalizeData({ node, helpers }) {
      const data = node.data as Partial<OFIterationNodeData>
      const title = normalizeOFNodeTitle(OFBlockEnum.Iteration, data.title)
      const baseSubgraph =
        data.subgraph?.nodes?.length || data.subgraph?.edges?.length
          ? data.subgraph
          : createDefaultIterationSubgraph(node.id, title)

      const normalizedNodes = (baseSubgraph.nodes || []).map((childNode) => {
        const normalizedChildNode = {
          ...JSON.parse(JSON.stringify(childNode)),
          parentNode: childNode.parentNode || node.id,
          extent: childNode.extent || 'parent'
        } as OFNode

        if (
          normalizedChildNode.data.type === OFBlockEnum.IterationStart ||
          normalizedChildNode.data.type === OFBlockEnum.Start
        ) {
          return createIterationStartNode(node.id, title)
        }

        return helpers.normalizeNode(normalizedChildNode)
      })

      const startNode =
        normalizedNodes.find((childNode) => childNode.data.type === OFBlockEnum.IterationStart) ||
        createIterationStartNode(node.id, title)

      const subgraph = {
        nodes: normalizedNodes.some((childNode) => childNode.id === startNode.id)
          ? normalizedNodes.map((childNode) =>
              childNode.id === startNode.id ? createIterationStartNode(node.id, title) : childNode
            )
          : [startNode, ...normalizedNodes],
        edges: (baseSubgraph.edges || []).map((edge) => JSON.parse(JSON.stringify(edge))),
        viewport: baseSubgraph.viewport || { ...DEFAULT_SUBGRAPH_VIEWPORT }
      }

      const normalized = {
        ...data,
        subgraph,
        start_node_id: startNode.id
      } as OFIterationNodeData
      normalizeOFRunnableNodeSelectorData(
        OFBlockEnum.Iteration,
        normalized as unknown as Record<string, unknown>,
        collectOFSelectorVariableRoots([node])
      )

      return {
        ...buildOFCommonNodeShape(data, title),
        type: OFBlockEnum.Iteration,
        width: data.width || DEFAULT_WIDTH,
        height: data.height || DEFAULT_HEIGHT,
        iterator_ref: normalized.iterator_ref,
        iterator_selector: getOFSelectorFromRef(normalized.iterator_ref),
        output_ref: normalized.output_ref,
        output_selector: getOFSelectorFromRef(normalized.output_ref),
        branch_output_refs: normalized.branch_output_refs || [],
        branch_output_selectors: data.branch_output_selectors || [],
        start_node_id: normalized.start_node_id,
        subgraph,
        parallel_mode: data.parallel_mode || 'sequential',
        parallel_nums: Math.max(1, Number(data.parallel_nums || 1)),
        error_handle_mode: data.error_handle_mode || 'terminated',
        flatten_output: data.flatten_output ?? true,
        output: {
          variables: buildIterationOutputs(title, node.id)
        }
      }
    }
  },
  compiler: {
    compileData({ node, compiledId, title, desc, helpers }) {
      const compiledSubgraph = helpers.compileContainerSubgraph(
        node,
        compiledId,
        title,
        OFBlockEnum.Iteration
      )
      return {
        title,
        desc,
        type: OFBlockEnum.Iteration,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        iterator_ref: {
          selector: helpers.compileSelectorField(
            node.config.iterator_ref?.selector || node.config.iterator_selector
          )
        },
        iterator_selector: helpers.compileSelectorField(
          node.config.iterator_ref?.selector || node.config.iterator_selector
        ),
        output_ref: {
          selector: helpers.compileSelectorField(
            node.config.output_ref?.selector || node.config.output_selector
          )
        },
        output_selector: helpers.compileSelectorField(
          node.config.output_ref?.selector || node.config.output_selector
        ),
        branch_output_refs: helpers.compileIterationBranchOutputSelectors(
          node.config.branch_output_selectors || []
        ),
        branch_output_selectors: node.config.branch_output_selectors || [],
        start_node_id: `${compiledId}-iteration-start`,
        subgraph: compiledSubgraph.graph,
        parallel_mode: node.config.parallel_mode || 'sequential',
        parallel_nums: Number(node.config.parallel_nums || 1),
        error_handle_mode: node.config.error_handle_mode || 'terminated',
        flatten_output: node.config.flatten_output ?? true,
        output: {
          variables: buildIterationOutputs(title, compiledId)
        }
      }
    }
  }
})
