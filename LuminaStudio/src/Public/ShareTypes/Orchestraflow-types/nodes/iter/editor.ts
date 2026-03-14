import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFIterationNodeData, OFNode } from '../../core-types'
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
  createDefaultIterationSubgraph,
  createIterationStartNode,
  ITERATION_NODE_DEFAULT_HEIGHT,
  ITERATION_NODE_DEFAULT_WIDTH,
  ITERATION_NODE_DEFAULT_VIEWPORT,
  iterationNodeRuntimeDefinition
} from './runtime'

export const iterationNodeEditor = {
  createDefaultData({ nodeId, title }: { nodeId: string; title: string }): OFIterationNodeData {
    return {
      title,
      desc: '',
      type: OFBlockEnum.Iteration,
      output_namespace:
        resolveOFNodeOutputNamespace(
          { runtime: iterationNodeRuntimeDefinition },
          {
            nodeId,
            title,
            fallback: 'iteration'
          }
        ) || 'iteration',
      width: ITERATION_NODE_DEFAULT_WIDTH,
      height: ITERATION_NODE_DEFAULT_HEIGHT,
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
        variables:
          iterationNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title:
              resolveOFNodeOutputNamespace(
                { runtime: iterationNodeRuntimeDefinition },
                {
                  nodeId,
                  title,
                  fallback: 'iteration'
                }
              ) || 'iteration',
            nodeId
          }) || []
      }
    }
  },
  normalizeData({ node, helpers }: OFNodeEditorNormalizeParams): OFIterationNodeData {
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
      viewport: baseSubgraph.viewport || { ...ITERATION_NODE_DEFAULT_VIEWPORT }
    }

    const normalized = {
      ...data,
      subgraph,
      start_node_id: startNode.id
    } as OFIterationNodeData
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: iterationNodeRuntimeDefinition },
        {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: 'iteration'
        }
      ) || 'iteration'
    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.Iteration,
      normalized as unknown as Record<string, unknown>,
      collectOFSelectorVariableRoots([node])
    )

    return {
      ...buildOFCommonNodeShape(data, title),
      type: OFBlockEnum.Iteration,
      output_namespace: outputNamespace,
      width: data.width || ITERATION_NODE_DEFAULT_WIDTH,
      height: data.height || ITERATION_NODE_DEFAULT_HEIGHT,
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
        variables:
          iterationNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId: node.id
          }) || []
      }
    }
  }
}
