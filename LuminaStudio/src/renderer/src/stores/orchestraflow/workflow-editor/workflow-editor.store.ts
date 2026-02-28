/**
 * OrchestraFlow 工作流编辑器 Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OFNode, OFEdge } from './workflow-editor.types'
import { WorkflowEditorDatasource } from './workflow-editor.datasource'
import { OFControlMode } from '@preload/types'

const datasource = new WorkflowEditorDatasource()

export const useWorkflowEditorStore = defineStore('orchestraflow-workflow-editor', () => {
  // ===== State =====
  const nodes = ref<OFNode[]>([])
  const edges = ref<OFEdge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const panelWidth = ref(400)
  const controlMode = ref<OFControlMode>(OFControlMode.Pointer)
  const viewport = ref({
    x: 0,
    y: 0,
    zoom: 1
  })

  // ===== Actions =====
  async function loadWorkflow(workflowId: string) {
    const data = await datasource.getWorkflow(workflowId)
    nodes.value = data.nodes
    edges.value = data.edges
  }

  async function saveWorkflow(workflowId: string) {
    await datasource.saveWorkflow(workflowId, {
      nodes: nodes.value,
      edges: edges.value
    })
  }

  function setNodes(newNodes: OFNode[]) {
    nodes.value = newNodes
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

  return {
    // state
    nodes,
    edges,
    selectedNodeId,
    panelWidth,
    controlMode,
    viewport,
    
    // actions
    loadWorkflow,
    saveWorkflow,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setPanelWidth,
    setControlMode,
    setViewport
  }
})
