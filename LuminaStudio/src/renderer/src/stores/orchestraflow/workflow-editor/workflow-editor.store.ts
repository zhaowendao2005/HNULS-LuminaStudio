/**
 * OrchestraFlow 工作流编辑器 Store
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { OFControlMode, type OFEdge, type OFNode } from '@shared/Orchestraflow-types'
import { normalizeNode } from './modules/workflow-editor.shared'
import { createWorkflowEditorGraphModule } from './modules/workflow-editor.graph'
import { createWorkflowEditorContainerModule } from './modules/workflow-editor.container'
import { createWorkflowEditorPersistenceModule } from './modules/workflow-editor.persistence'
import { createWorkflowEditorActionsModule } from './modules/workflow-editor.actions'

export const useWorkflowEditorStore = defineStore('orchestraflow-workflow-editor', () => {
  const nodes = ref<OFNode[]>([])
  const edges = ref<OFEdge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const panelWidth = ref(400)
  const controlMode = ref<OFControlMode>(OFControlMode.Pointer)
  const viewport = ref({ x: 0, y: 0, zoom: 1 })
  const currentWorkflowId = ref<string | null>(null)

  function setNodesState(nextNodes: OFNode[]) {
    nodes.value = nextNodes
  }

  function setEdgesState(nextEdges: OFEdge[]) {
    edges.value = nextEdges
  }

  const graphModule = createWorkflowEditorGraphModule({
    getNodes: () => nodes.value,
    getEdges: () => edges.value,
    setNodes: setNodesState,
    setEdges: setEdgesState
  })

  const persistenceModule = createWorkflowEditorPersistenceModule({
    getNodes: () => nodes.value,
    getEdges: () => edges.value,
    getCurrentWorkflowId: () => currentWorkflowId.value,
    setCurrentWorkflowId: (workflowId) => {
      currentWorkflowId.value = workflowId
    },
    setNodes: setNodesState,
    setEdges: setEdgesState,
    clearSelectedNodeId: () => {
      selectedNodeId.value = null
    },
    buildIterationEdgeData: graphModule.buildIterationEdgeData,
    syncIterationContainerSize: (nodeId) => containerModule.syncIterationContainerSize(nodeId)
  })

  const containerModule = createWorkflowEditorContainerModule({
    getNodes: () => nodes.value,
    getEdges: () => edges.value,
    setNodes: setNodesState,
    setEdges: setEdgesState,
    scheduleSave: persistenceModule.scheduleSave,
    findNodeById: graphModule.findNodeById,
    findParentIterationNodeId: graphModule.findParentIterationNodeId,
    getIterationChildNodes: graphModule.getIterationChildNodes,
    isDuplicateEdgeCandidate: graphModule.isDuplicateEdgeCandidate,
    buildIterationEdgeData: graphModule.buildIterationEdgeData,
    updateNodeCollection: graphModule.updateNodeCollection,
    updateNodePositionCollection: graphModule.updateNodePositionCollection
  })

  const actionsModule = createWorkflowEditorActionsModule({
    getNodes: () => nodes.value,
    getEdges: () => edges.value,
    getSelectedNodeId: () => selectedNodeId.value,
    setNodes: setNodesState,
    setEdges: setEdgesState,
    setSelectedNodeId: (nodeId) => {
      selectedNodeId.value = nodeId
    },
    scheduleSave: persistenceModule.scheduleSave,
    findNodeById: graphModule.findNodeById,
    findParentIterationNodeId: graphModule.findParentIterationNodeId,
    isIterationLocalStart: graphModule.isIterationLocalStart,
    collectCascadeNodeIds: graphModule.collectCascadeNodeIds,
    isDuplicateEdgeCandidate: graphModule.isDuplicateEdgeCandidate,
    buildIterationEdgeData: graphModule.buildIterationEdgeData,
    updateNodeCollection: graphModule.updateNodeCollection,
    updateNodePositionCollection: graphModule.updateNodePositionCollection,
    syncIterationSubgraphSnapshot: graphModule.syncIterationSubgraphSnapshot,
    syncExpandedSubgraphChildren: graphModule.syncExpandedSubgraphChildren,
    syncIterationContainerSize: containerModule.syncIterationContainerSize
  })

  function setNodes(newNodes: OFNode[]) {
    nodes.value = newNodes.map(normalizeNode)
  }

  function setEdges(newEdges: OFEdge[]) {
    edges.value = newEdges
  }

  function setSelectedNodeId(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function setPanelWidth(width: number) {
    panelWidth.value = width
  }

  function setControlMode(mode: OFControlMode) {
    controlMode.value = mode
  }

  function setViewport(x: number, y: number, zoom: number) {
    viewport.value = { x, y, zoom }
  }

  // 这里把 container mechanism 暴露给 renderer 层，
  // 让面板和画布都能直接读取“规则说明”和“失败原因”，而不是只依赖隐式行为。
  const containerMechanismHints = computed(() =>
    containerModule.getContainerMechanismHints(selectedNodeId.value)
  )

  return {
    nodes,
    edges,
    selectedNodeId,
    panelWidth,
    controlMode,
    viewport,
    currentWorkflowId,
    containerMechanismHints,
    loadWorkflow: persistenceModule.loadWorkflow,
    saveWorkflow: persistenceModule.saveWorkflow,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setPanelWidth,
    setControlMode,
    setViewport,
    addNode: actionsModule.addNode,
    updateNode: actionsModule.updateNode,
    updateNodeRunningStatus: actionsModule.updateNodeRunningStatus,
    resetAllNodeRunningStatus: actionsModule.resetAllNodeRunningStatus,
    removeNode: actionsModule.removeNode,
    addEdge: actionsModule.addEdge,
    removeEdge: actionsModule.removeEdge,
    findNodeById: graphModule.findNodeById,
    getNodeAncestorPath: graphModule.getNodeAncestorPath,
    findParentIterationNodeId: graphModule.findParentIterationNodeId,
    resizeIterationNode: containerModule.resizeIterationNode,
    updateIterationViewport: containerModule.updateIterationViewport,
    updateIterationChildPosition: containerModule.updateIterationChildPosition,
    addIterationEdge: containerModule.addIterationEdge,
    moveNodeIntoIterationNode: containerModule.moveNodeIntoIterationNode,
    getMoveNodeIntoContainerGuard: containerModule.getMoveNodeIntoContainerGuard,
    getContainerMechanismHints: containerModule.getContainerMechanismHints,
    unloadWorkflow: persistenceModule.unloadWorkflow,
    updateNodePosition: actionsModule.updateNodePosition,
    applyNodeChanges: actionsModule.applyNodeChanges,
    applyEdgeChanges: actionsModule.applyEdgeChanges
  }
})
