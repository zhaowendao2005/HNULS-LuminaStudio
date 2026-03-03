/**
 * OrchestraFlow 工作流编辑器 Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFControlMode,
  OFBlockEnum
} from '@Public/ShareTypes/Orchestraflow-types'
import type {
  OFNode,
  OFEdge,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData
} from '@Public/ShareTypes/Orchestraflow-types'
import { WorkflowEditorDataSource } from './workflow-editor.datasource'

const datasource = WorkflowEditorDataSource

export const useWorkflowEditorStore = defineStore('orchestraflow-workflow-editor', () => {
  // State
  const nodes = ref<OFNode[]>([])
  const edges = ref<OFEdge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const panelWidth = ref(400)
  const controlMode = ref<OFControlMode>(OFControlMode.Pointer)
  const viewport = ref({ x: 0, y: 0, zoom: 1 })
  const currentWorkflowId = ref<string | null>(null)

  // Actions
  async function loadWorkflow(workflowId: string) {
    currentWorkflowId.value = workflowId
    const data = await datasource.get(workflowId)
    nodes.value = data.nodes
    edges.value = data.edges
  }

  async function saveWorkflow() {
    if (!currentWorkflowId.value) return
    await datasource.update(currentWorkflowId.value, { nodes: nodes.value, edges: edges.value })
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

  // 添加节点
  function addNode(type: OFBlockEnum): string {
    const id = `node_${type}_${Date.now()}`
    const position = { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 }

    let nodeData: OFStartNodeData | OFLLMNodeData | OFEndNodeData

    switch (type) {
      case OFBlockEnum.Start:
        nodeData = {
          title: '开始',
          desc: '',
          type: OFBlockEnum.Start,
          inputs: []
        } as OFStartNodeData
        break
      case OFBlockEnum.LLM:
        nodeData = {
          title: 'LLM',
          desc: '',
          type: OFBlockEnum.LLM,
          model: { provider: '', name: '' },
          prompt_template: [],
          outputs: []
        } as OFLLMNodeData
        break
      case OFBlockEnum.End:
        nodeData = { title: '结束', desc: '', type: OFBlockEnum.End, outputs: [] } as OFEndNodeData
        break
    }

    // 根据节点类型设置正确的 VueFlow 节点类型
    let vueFlowType: string
    switch (type) {
      case OFBlockEnum.Start:
        vueFlowType = 'start'
        break
      case OFBlockEnum.LLM:
        vueFlowType = 'llm'
        break
      case OFBlockEnum.End:
        vueFlowType = 'end'
        break
    }

    const newNode: OFNode = { id, type: vueFlowType, position, data: nodeData }
    nodes.value = [...nodes.value, newNode]
    return id
  }

  // 更新节点数据
  function updateNode(nodeId: string, data: Partial<OFNode['data']>) {
    const index = nodes.value.findIndex((n) => n.id === nodeId)
    if (index !== -1) {
      nodes.value[index] = { ...nodes.value[index], data: { ...nodes.value[index].data, ...data } }
    }
  }

  // 删除节点
  function removeNode(nodeId: string) {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
  }

  // 添加边
  function addEdge(edge: OFEdge) {
    edges.value = [...edges.value, edge]
  }
  // 删除边
  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId)
  }

  // 卸载工作流
  function unloadWorkflow() {
    currentWorkflowId.value = null
    nodes.value = []
    edges.value = []
    selectedNodeId.value = null
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    panelWidth,
    controlMode,
    viewport,
    currentWorkflowId,
    loadWorkflow,
    saveWorkflow,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setPanelWidth,
    setControlMode,
    setViewport,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    unloadWorkflow
  }
})
