/**
 * OrchestraFlow 工作流编辑器 Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { OFControlMode, OFBlockEnum } from '@shared/Orchestraflow-types'
import type {
  OFNode,
  OFEdge,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData
} from '@shared/Orchestraflow-types'
import type { NodeChange, EdgeChange } from '@vue-flow/core'
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

  // 防抖定时器
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  // Actions
  async function loadWorkflow(workflowId: string) {
    currentWorkflowId.value = workflowId
    const data = await datasource.get(workflowId)
    nodes.value = data.nodes
    edges.value = data.edges
  }

  async function saveWorkflow() {
    if (!currentWorkflowId.value) return
    // 深拷贝去除 Vue 响应式属性和 VueFlow 内部属性
    const nodesData = JSON.parse(JSON.stringify(nodes.value))
    const edgesData = JSON.parse(JSON.stringify(edges.value))
    await datasource.update(currentWorkflowId.value, { nodes: nodesData, edges: edgesData })
  }

  // 防抖保存（用于拖拽等高频操作）
  function scheduleSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveWorkflow()
      saveTimer = null
    }, 1000) // 1 秒防抖
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
    let vueFlowType: string = 'llm'
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
    scheduleSave()
    return id
  }

  // 更新节点数据
  function updateNode(nodeId: string, data: Partial<OFNode['data']>) {
    const index = nodes.value.findIndex((n) => n.id === nodeId)
    if (index !== -1) {
      nodes.value[index] = { ...nodes.value[index], data: { ...nodes.value[index].data, ...data } }
      scheduleSave()
    }
  }

  // 删除节点
  function removeNode(nodeId: string) {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    scheduleSave()
  }

  // 添加边
  function addEdge(edge: OFEdge) {
    edges.value = [...edges.value, edge]
    scheduleSave()
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

  // 更新节点位置（拖拽结束后调用）
  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const index = nodes.value.findIndex((n) => n.id === nodeId)
    if (index !== -1) {
      nodes.value[index] = { ...nodes.value[index], position }
      scheduleSave()
    }
  }

  // 应用节点变化数组（来自 VueFlow @nodes-change）
  function applyNodeChanges(changes: NodeChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item) {
            nodes.value = [...nodes.value, change.item as OFNode]
          }
          break
        case 'remove':
          nodes.value = nodes.value.filter((n) => n.id !== change.id)
          edges.value = edges.value.filter((e) => e.source !== change.id && e.target !== change.id)
          break
        case 'select':
          // 选中状态变化不需要保存
          break
        case 'position':
          // 位置变化在 node-drag-stop 时单独处理，这里忽略
          break
        case 'dimensions':
          // 尺寸变化不需要保存
          break
      }
    }
    scheduleSave()
  }

  // 应用边变化数组（来自 VueFlow @edges-change）
  function applyEdgeChanges(changes: EdgeChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item) {
            edges.value = [...edges.value, change.item as OFEdge]
          }
          break
        case 'remove':
          edges.value = edges.value.filter((e) => e.id !== change.id)
          break
        case 'select':
          // 选中状态变化不需要保存
          break
      }
    }
    scheduleSave()
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
    unloadWorkflow,
    updateNodePosition,
    applyNodeChanges,
    applyEdgeChanges
  }
})
