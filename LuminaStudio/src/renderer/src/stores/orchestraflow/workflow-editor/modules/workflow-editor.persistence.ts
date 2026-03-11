import {
  OFBlockEnum,
  type OFEdge,
  type OFIterationNodeData,
  type OFLoopNodeData,
  type OFNode
} from '@shared/Orchestraflow-types'
import { WorkflowEditorDataSource } from '../workflow-editor.datasource'
import {
  cloneEdge,
  cloneNode,
  dedupeEdges,
  dedupeNodes,
  normalizeNode
} from './workflow-editor.shared'

interface WorkflowEditorPersistenceDeps {
  getNodes: () => OFNode[]
  getEdges: () => OFEdge[]
  getCurrentWorkflowId: () => string | null
  setCurrentWorkflowId: (workflowId: string | null) => void
  setNodes: (nextNodes: OFNode[]) => void
  setEdges: (nextEdges: OFEdge[]) => void
  clearSelectedNodeId: () => void
  buildIterationEdgeData: (edge: OFEdge, sourceNodes?: OFNode[]) => OFEdge
  syncIterationContainerSize: (nodeId: string) => void
}

const datasource = WorkflowEditorDataSource

export function createWorkflowEditorPersistenceModule(deps: WorkflowEditorPersistenceDeps) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  async function loadWorkflow(workflowId: string) {
    deps.setCurrentWorkflowId(workflowId)
    const data = await datasource.get(workflowId)
    const normalizedNodes = data.nodes.map(normalizeNode)
    const inflatedNodes = [...normalizedNodes]
    const inflatedEdges = data.edges.map((edge) => cloneEdge(edge))

    normalizedNodes.forEach((node) => {
      if (node.data.type !== OFBlockEnum.Iteration && node.data.type !== OFBlockEnum.Loop) return
      const subgraph =
        node.data.type === OFBlockEnum.Iteration
          ? (node.data as OFIterationNodeData).subgraph
          : (node.data as OFLoopNodeData).subgraph
      subgraph.nodes.forEach((childNode) => {
        inflatedNodes.push(cloneNode(childNode))
      })
      subgraph.edges.forEach((childEdge) => {
        inflatedEdges.push(cloneEdge(childEdge))
      })
    })

    const nextNodes = dedupeNodes(inflatedNodes)
    const nextEdges = dedupeEdges(
      inflatedEdges.map((edge) => deps.buildIterationEdgeData(edge, nextNodes))
    )

    deps.setNodes(nextNodes)
    deps.setEdges(nextEdges)
    nextNodes
      .filter(
        (node) => node.data.type === OFBlockEnum.Iteration || node.data.type === OFBlockEnum.Loop
      )
      .forEach((node) => deps.syncIterationContainerSize(node.id))
  }

  async function saveWorkflow() {
    const workflowId = deps.getCurrentWorkflowId()
    if (!workflowId) return

    const nodes = deps.getNodes()
    const edges = deps.getEdges()
    const rootNodes = nodes.filter((node) => !node.parentNode)
    const rootNodeIds = new Set(rootNodes.map((node) => node.id))

    const nodesData = cloneNode(
      rootNodes.map((node) => {
        if (node.data.type !== OFBlockEnum.Iteration && node.data.type !== OFBlockEnum.Loop) {
          return node
        }

        const childNodes = nodes
          .filter((candidate) => candidate.parentNode === node.id)
          .map((candidate) => cloneNode(candidate))
        const childNodeIds = new Set(childNodes.map((candidate) => candidate.id))
        const childEdges = edges
          .filter((edge) => childNodeIds.has(edge.source) && childNodeIds.has(edge.target))
          .map((edge) => cloneEdge(edge))

        return {
          ...node,
          data: {
            ...(node.data as OFIterationNodeData | OFLoopNodeData),
            subgraph: {
              ...(node.data as OFIterationNodeData | OFLoopNodeData).subgraph,
              nodes: childNodes,
              edges: childEdges
            }
          }
        }
      })
    )

    const edgesData = cloneNode(
      edges.filter((edge) => rootNodeIds.has(edge.source) && rootNodeIds.has(edge.target))
    )

    await datasource.update(workflowId, { nodes: nodesData, edges: edgesData })
  }

  // 拖拽、缩放、批量编辑都可能高频触发，这里统一做防抖保存。
  function scheduleSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveWorkflow()
      saveTimer = null
    }, 1000)
  }

  function unloadWorkflow() {
    deps.setCurrentWorkflowId(null)
    deps.setNodes([])
    deps.setEdges([])
    deps.clearSelectedNodeId()
  }

  return {
    loadWorkflow,
    saveWorkflow,
    scheduleSave,
    unloadWorkflow
  }
}
