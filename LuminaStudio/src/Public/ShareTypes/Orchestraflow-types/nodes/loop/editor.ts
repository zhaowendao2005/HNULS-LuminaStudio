import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFLoopNodeData, OFNode } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import {
  buildOFCommonNodeShape,
  normalizeOFNodeTitle,
  resolveOFNodeOutputNamespace
} from '../../node-definition'
import {
  collectOFSelectorVariableRoots,
  getOFSelectorFromRef,
  normalizeOFRunnableNodeSelectorData
} from '../../selector-utils'
import {
  createDefaultLoopSubgraph,
  createDefaultLoopVariables,
  createLoopStartNode,
  LOOP_NODE_DEFAULT_HEIGHT,
  LOOP_NODE_DEFAULT_VIEWPORT,
  LOOP_NODE_DEFAULT_WIDTH,
  loopNodeRuntimeDefinition
} from './runtime'

export const loopNodeEditor = {
  createDefaultData({ nodeId, title }: { nodeId: string; title: string }): OFLoopNodeData {
    const loopVariables = createDefaultLoopVariables()
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: loopNodeRuntimeDefinition },
        {
          nodeId,
          title,
          fallback: 'loop'
        }
      ) || 'loop'
    return {
      title,
      desc: '',
      type: OFBlockEnum.Loop,
      output_namespace: outputNamespace,
      width: LOOP_NODE_DEFAULT_WIDTH,
      height: LOOP_NODE_DEFAULT_HEIGHT,
      loop_count: 10,
      loop_variables: loopVariables,
      break_conditions: [],
      logical_operator: 'and',
      start_node_id: `${nodeId}-loop-start`,
      subgraph: createDefaultLoopSubgraph(nodeId, title, loopVariables),
      output: {
        variables:
          loopNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            loopVariables,
            nodeId
          }) || []
      }
    }
  },
  normalizeData({ node, helpers }: OFNodeEditorNormalizeParams): OFLoopNodeData {
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
      viewport: baseSubgraph.viewport || { ...LOOP_NODE_DEFAULT_VIEWPORT }
    }

    const normalized = {
      ...data,
      loop_variables: loopVariables,
      break_conditions: data.break_conditions || [],
      subgraph,
      start_node_id: startNode.id
    } as OFLoopNodeData
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: loopNodeRuntimeDefinition },
        {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: 'loop'
        }
      ) || 'loop'
    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.Loop,
      normalized as unknown as Record<string, unknown>,
      collectOFSelectorVariableRoots([node])
    )

    return {
      ...buildOFCommonNodeShape(data, title),
      type: OFBlockEnum.Loop,
      output_namespace: outputNamespace,
      width: data.width || LOOP_NODE_DEFAULT_WIDTH,
      height: data.height || LOOP_NODE_DEFAULT_HEIGHT,
      loop_count: Math.max(1, Number(data.loop_count || 10)),
      loop_count_ref: data.loop_count_ref,
      loop_count_selector: data.loop_count_selector || getOFSelectorFromRef(data.loop_count_ref),
      loop_variables: normalized.loop_variables,
      break_conditions: normalized.break_conditions || [],
      logical_operator: normalized.logical_operator || 'and',
      start_node_id: normalized.start_node_id,
      subgraph,
      output: {
        variables:
          loopNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            loopVariables,
            nodeId: node.id
          }) || []
      }
    }
  }
}
