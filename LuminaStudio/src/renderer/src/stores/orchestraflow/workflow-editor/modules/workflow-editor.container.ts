import {
  OFBlockEnum,
  type OFEdge,
  type OFIterationNodeData,
  type OFLoopNodeData,
  type OFNode
} from '@shared/Orchestraflow-types'
import {
  getNestedNodeFootprint,
  ITERATION_MIN_HEIGHT,
  ITERATION_MIN_WIDTH,
  ITERATION_RESIZE_PADDING_X,
  ITERATION_RESIZE_PADDING_Y,
  normalizeNode
} from './workflow-editor.shared'
import type { WorkflowEditorGraphContext } from './workflow-editor.graph'

interface WorkflowEditorContainerDeps extends WorkflowEditorGraphContext {
  scheduleSave: () => void
  findNodeById: (nodeId: string) => OFNode | null
  findParentIterationNodeId: (nodeId: string) => string | null
  getIterationChildNodes: (iterationNodeId: string) => OFNode[]
  isDuplicateEdgeCandidate: (edge: OFEdge) => boolean
  buildIterationEdgeData: (edge: OFEdge, sourceNodes?: OFNode[]) => OFEdge
  updateNodeCollection: (
    sourceNodes: OFNode[],
    targetNodeId: string,
    patch: Partial<OFNode['data']>
  ) => OFNode[]
  updateNodePositionCollection: (
    sourceNodes: OFNode[],
    targetNodeId: string,
    position: { x: number; y: number }
  ) => OFNode[]
}

export function createWorkflowEditorContainerModule(deps: WorkflowEditorContainerDeps) {
  function syncIterationContainerSize(iterationNodeId: string) {
    const iterationNode = deps.findNodeById(iterationNodeId)
    if (
      !iterationNode ||
      (iterationNode.data.type !== OFBlockEnum.Iteration &&
        iterationNode.data.type !== OFBlockEnum.Loop)
    ) {
      return
    }

    const childNodes = deps.getIterationChildNodes(iterationNodeId)
    let nextWidth = Math.max(Number(iterationNode.data.width || 0), ITERATION_MIN_WIDTH)
    let nextHeight = Math.max(Number(iterationNode.data.height || 0), ITERATION_MIN_HEIGHT)

    childNodes.forEach((childNode) => {
      const size = getNestedNodeFootprint(childNode)
      nextWidth = Math.max(
        nextWidth,
        Math.round(childNode.position.x + size.width + ITERATION_RESIZE_PADDING_X)
      )
      nextHeight = Math.max(
        nextHeight,
        Math.round(childNode.position.y + size.height + ITERATION_RESIZE_PADDING_Y)
      )
    })

    deps.setNodes(
      deps.updateNodeCollection(deps.getNodes(), iterationNodeId, {
        width: nextWidth,
        height: nextHeight
      })
    )
  }

  function resizeIterationNode(nodeId: string, width: number, height: number) {
    const childNodes = deps.getIterationChildNodes(nodeId)
    let minWidth = ITERATION_MIN_WIDTH
    let minHeight = ITERATION_MIN_HEIGHT

    childNodes.forEach((childNode) => {
      const size = getNestedNodeFootprint(childNode)
      minWidth = Math.max(
        minWidth,
        Math.round(childNode.position.x + size.width + ITERATION_RESIZE_PADDING_X)
      )
      minHeight = Math.max(
        minHeight,
        Math.round(childNode.position.y + size.height + ITERATION_RESIZE_PADDING_Y)
      )
    })

    deps.setNodes(
      deps.updateNodeCollection(deps.getNodes(), nodeId, {
        width: Math.max(minWidth, Math.round(width)),
        height: Math.max(minHeight, Math.round(height))
      })
    )
    deps.scheduleSave()
  }

  function updateIterationViewport(
    nodeId: string,
    viewportValue: { x: number; y: number; zoom: number }
  ) {
    const target = deps.findNodeById(nodeId)
    if (
      !target ||
      (target.data.type !== OFBlockEnum.Iteration && target.data.type !== OFBlockEnum.Loop)
    ) {
      return
    }

    deps.setNodes(
      deps.updateNodeCollection(deps.getNodes(), nodeId, {
        subgraph: {
          ...(target.data as OFIterationNodeData | OFLoopNodeData).subgraph,
          viewport: viewportValue
        }
      } as Partial<OFIterationNodeData & OFLoopNodeData>)
    )
  }

  function updateIterationChildPosition(
    iterationNodeId: string,
    childNodeId: string,
    position: { x: number; y: number }
  ) {
    deps.setNodes(deps.updateNodePositionCollection(deps.getNodes(), childNodeId, position))
    syncIterationContainerSize(iterationNodeId)
    deps.scheduleSave()
  }

  function addIterationEdge(iterationNodeId: string, edge: OFEdge) {
    if (deps.isDuplicateEdgeCandidate(edge)) return
    deps.setEdges([...deps.getEdges(), deps.buildIterationEdgeData(edge)])
    syncIterationContainerSize(iterationNodeId)
    deps.scheduleSave()
  }

  // 外部节点拖进容器后，要补 parent/extent，并同步容器尺寸。
  function moveNodeIntoIterationNode(
    nodeId: string,
    iterationNodeId: string,
    dropPosition: { x: number; y: number }
  ) {
    const movingNode = deps.findNodeById(nodeId)
    const targetIteration = deps.findNodeById(iterationNodeId)
    if (
      !movingNode ||
      !targetIteration ||
      (targetIteration.data.type !== OFBlockEnum.Iteration &&
        targetIteration.data.type !== OFBlockEnum.Loop)
    ) {
      return
    }
    if (nodeId === iterationNodeId) return
    if (
      movingNode.data.type === OFBlockEnum.Start ||
      movingNode.data.type === OFBlockEnum.IterationStart ||
      movingNode.data.type === OFBlockEnum.LoopStart ||
      movingNode.data.type === OFBlockEnum.End
    ) {
      return
    }

    const hasConnectedEdges = deps
      .getEdges()
      .some((edge) => edge.source === nodeId || edge.target === nodeId)
    if (hasConnectedEdges) return

    const parentIterationId = deps.findParentIterationNodeId(nodeId)
    if (parentIterationId) return

    const detachedNode = normalizeNode({
      ...movingNode,
      parentNode: iterationNodeId,
      extent: 'parent',
      position: {
        x: Math.max(16, Math.round(dropPosition.x)),
        y: Math.max(16, Math.round(dropPosition.y))
      }
    })

    deps.setNodes(deps.getNodes().map((node) => (node.id === nodeId ? detachedNode : node)))
    syncIterationContainerSize(iterationNodeId)
    deps.scheduleSave()
  }

  return {
    syncIterationContainerSize,
    resizeIterationNode,
    updateIterationViewport,
    updateIterationChildPosition,
    addIterationEdge,
    moveNodeIntoIterationNode
  }
}
