import {
  OFBlockEnum,
  getOFEdgeSourcePortId,
  getOFEdgeTargetPortId,
  type OFEdge,
  type OFNode,
  type OFIterationNodeData,
  type OFLoopNodeData
} from '@shared/Orchestraflow-types'
import {
  cloneEdge,
  cloneNode,
  dedupeEdges,
  dedupeNodes,
  normalizeNode
} from './workflow-editor.shared'

export interface WorkflowEditorGraphContext {
  getNodes: () => OFNode[]
  getEdges: () => OFEdge[]
  setNodes: (nextNodes: OFNode[]) => void
  setEdges: (nextEdges: OFEdge[]) => void
}

export function createWorkflowEditorGraphModule(context: WorkflowEditorGraphContext) {
  function findNodeByIdFrom(nodeId: string, sourceNodes: OFNode[]): OFNode | null {
    return sourceNodes.find((node) => node.id === nodeId) || null
  }

  function getNodeAncestorPathFrom(nodeId: string, sourceNodes: OFNode[]): string[] {
    const path: string[] = []
    let currentNode = findNodeByIdFrom(nodeId, sourceNodes)

    while (currentNode?.parentNode) {
      path.unshift(currentNode.parentNode)
      currentNode = findNodeByIdFrom(currentNode.parentNode, sourceNodes)
    }

    return path
  }

  function findNodeById(nodeId: string): OFNode | null {
    return findNodeByIdFrom(nodeId, context.getNodes())
  }

  function getNodeAncestorPath(nodeId: string): string[] {
    return getNodeAncestorPathFrom(nodeId, context.getNodes())
  }

  function findParentIterationNodeId(nodeId: string): string | null {
    const ancestorPath = getNodeAncestorPath(nodeId)

    for (let index = ancestorPath.length - 1; index >= 0; index -= 1) {
      const ancestorNode = findNodeByIdFrom(ancestorPath[index], context.getNodes())
      if (
        ancestorNode?.data.type === OFBlockEnum.Iteration ||
        ancestorNode?.data.type === OFBlockEnum.Loop
      ) {
        return ancestorNode.id
      }
    }

    return null
  }

  function isIterationLocalStart(nodeId: string): boolean {
    const targetNode = findNodeById(nodeId)
    return (
      targetNode?.data.type === OFBlockEnum.IterationStart ||
      targetNode?.data.type === OFBlockEnum.LoopStart
    )
  }

  function getIterationChildNodes(iterationNodeId: string): OFNode[] {
    return context.getNodes().filter((node) => node.parentNode === iterationNodeId)
  }

  function getNodeLayerKey(nodeId: string): string {
    const ancestorPath = getNodeAncestorPath(nodeId)
    return ancestorPath.join('/') || 'root'
  }

  // 级联删除时，不仅要删父节点，还要把容器 subgraph 和展开节点一起删掉。
  function collectCascadeNodeIds(rootNodeId: string): Set<string> {
    const removedNodeIds = new Set<string>([rootNodeId])
    const pendingNodeIds = [rootNodeId]

    while (pendingNodeIds.length > 0) {
      const currentNodeId = pendingNodeIds.pop()!
      const currentNode = findNodeByIdFrom(currentNodeId, context.getNodes())
      const subgraphNodes = (currentNode?.data as { subgraph?: { nodes?: OFNode[] } } | undefined)
        ?.subgraph?.nodes

      ;(subgraphNodes || []).forEach((childNode) => {
        if (!removedNodeIds.has(childNode.id)) {
          removedNodeIds.add(childNode.id)
          pendingNodeIds.push(childNode.id)
        }
      })
    }

    let changed = true
    while (changed) {
      changed = false
      context.getNodes().forEach((node) => {
        if (
          node.parentNode &&
          removedNodeIds.has(node.parentNode) &&
          !removedNodeIds.has(node.id)
        ) {
          removedNodeIds.add(node.id)
          changed = true
        }
      })
    }

    return removedNodeIds
  }

  function isDuplicateEdgeCandidate(edge: OFEdge): boolean {
    const layerKey = getNodeLayerKey(edge.source)
    return context.getEdges().some((candidate) => {
      return (
        candidate.source === edge.source &&
        candidate.target === edge.target &&
        getOFEdgeSourcePortId(candidate) === getOFEdgeSourcePortId(edge) &&
        getOFEdgeTargetPortId(candidate) === getOFEdgeTargetPortId(edge) &&
        getNodeLayerKey(candidate.source) === layerKey &&
        getNodeLayerKey(candidate.target) === layerKey
      )
    })
  }

  // 子图边在展开到主画布时，需要补全 VueFlow 渲染依赖的数据字段。
  function buildIterationEdgeData(
    edge: OFEdge,
    sourceNodes: OFNode[] = context.getNodes()
  ): OFEdge {
    const sourceNode = findNodeByIdFrom(edge.source, sourceNodes)
    const targetNode = findNodeByIdFrom(edge.target, sourceNodes)
    const sourceAncestorPath = sourceNode ? getNodeAncestorPathFrom(sourceNode.id, sourceNodes) : []
    const targetAncestorPath = targetNode ? getNodeAncestorPathFrom(targetNode.id, sourceNodes) : []
    const iterationId =
      sourceAncestorPath[sourceAncestorPath.length - 1] ||
      targetAncestorPath[targetAncestorPath.length - 1] ||
      undefined

    if (!sourceNode || !targetNode) {
      return edge
    }

    return {
      ...edge,
      source_port_id: getOFEdgeSourcePortId(edge),
      target_port_id: getOFEdgeTargetPortId(edge),
      sourceHandle: getOFEdgeSourcePortId(edge),
      targetHandle: getOFEdgeTargetPortId(edge),
      class: iterationId ? 'of-edge-iteration' : edge.class,
      zIndex: iterationId ? 7 : edge.zIndex,
      data: {
        ...edge.data,
        isInIteration: Boolean(iterationId),
        iterationId,
        sourceType: sourceNode.data.type,
        targetType: targetNode.data.type
      }
    }
  }

  function updateNodeCollection(
    sourceNodes: OFNode[],
    targetNodeId: string,
    patch: Partial<OFNode['data']>
  ): OFNode[] {
    return sourceNodes.map((node) => {
      if (node.id === targetNodeId) {
        return normalizeNode({
          ...node,
          data: {
            ...node.data,
            ...patch
          }
        } as OFNode)
      }
      return node
    })
  }

  function updateNodePositionCollection(
    sourceNodes: OFNode[],
    targetNodeId: string,
    position: { x: number; y: number }
  ): OFNode[] {
    return sourceNodes.map((node) => {
      if (node.id === targetNodeId) {
        return {
          ...node,
          position
        }
      }
      return node
    })
  }

  // 将当前画布里的展开子节点重新回写到容器节点的 subgraph 快照里。
  function syncIterationSubgraphSnapshot(iterationNodeId: string) {
    const iterationNode = findNodeById(iterationNodeId)
    if (
      !iterationNode ||
      (iterationNode.data.type !== OFBlockEnum.Iteration &&
        iterationNode.data.type !== OFBlockEnum.Loop)
    ) {
      return
    }

    const childNodes = context
      .getNodes()
      .filter((candidate) => candidate.parentNode === iterationNodeId)
      .map((candidate) => cloneNode(candidate))
    const childNodeIds = new Set(childNodes.map((candidate) => candidate.id))
    const childEdges = context
      .getEdges()
      .filter((edge) => childNodeIds.has(edge.source) && childNodeIds.has(edge.target))
      .map((edge) => cloneEdge(edge))

    context.setNodes(
      updateNodeCollection(context.getNodes(), iterationNodeId, {
        subgraph: {
          ...(iterationNode.data as OFIterationNodeData | OFLoopNodeData).subgraph,
          nodes: childNodes,
          edges: childEdges
        }
      } as Partial<OFIterationNodeData & OFLoopNodeData>)
    )
  }

  // 容器节点 data.subgraph 改变后，要把子节点重新展开回主画布，保持画布和 data 同步。
  function syncExpandedSubgraphChildren(iterationNodeId: string) {
    const iterationNode = findNodeById(iterationNodeId)
    if (
      !iterationNode ||
      (iterationNode.data.type !== OFBlockEnum.Iteration &&
        iterationNode.data.type !== OFBlockEnum.Loop)
    ) {
      return
    }

    const subgraph = (iterationNode.data as OFIterationNodeData | OFLoopNodeData).subgraph
    const nextChildNodes = (subgraph?.nodes || []).map((node) => normalizeNode(cloneNode(node)))
    const nextChildNodeIds = new Set(nextChildNodes.map((node) => node.id))
    const previousChildNodeIds = new Set(
      context
        .getNodes()
        .filter((node) => node.parentNode === iterationNodeId)
        .map((node) => node.id)
    )

    context.setNodes(
      dedupeNodes([
        ...context.getNodes().filter((node) => node.parentNode !== iterationNodeId),
        ...nextChildNodes
      ])
    )

    context.setEdges(
      dedupeEdges([
        ...context
          .getEdges()
          .filter(
            (edge) =>
              !(previousChildNodeIds.has(edge.source) && previousChildNodeIds.has(edge.target))
          ),
        ...(subgraph?.edges || [])
          .filter((edge) => nextChildNodeIds.has(edge.source) && nextChildNodeIds.has(edge.target))
          .map((edge) => buildIterationEdgeData(cloneEdge(edge)))
      ])
    )
  }

  return {
    cloneEdge,
    findNodeById,
    findNodeByIdFrom,
    getNodeAncestorPath,
    getNodeAncestorPathFrom,
    findParentIterationNodeId,
    isIterationLocalStart,
    getIterationChildNodes,
    collectCascadeNodeIds,
    isDuplicateEdgeCandidate,
    buildIterationEdgeData,
    updateNodeCollection,
    updateNodePositionCollection,
    syncIterationSubgraphSnapshot,
    syncExpandedSubgraphChildren
  }
}
