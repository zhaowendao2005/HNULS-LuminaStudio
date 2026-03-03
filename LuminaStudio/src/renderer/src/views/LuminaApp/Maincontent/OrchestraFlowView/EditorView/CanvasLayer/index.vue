<template>
  <div class="of-editor-canvas-layer absolute inset-0">
    <VueFlow
      :nodes="store.nodes"
      :edges="store.edges"
      :default-viewport="{
        x: store.viewport.x,
        y: store.viewport.y,
        zoom: store.viewport.zoom
      }"
      class="of-editor-canvas h-full w-full"
      @node-click="handleNodeClick"
      @connect="handleConnect"
      @node-drag-stop="handleNodeDragStop"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
    >
      <!-- 自定义节点 -->
      <template #node-start="props">
        <StartNode v-bind="props" />
      </template>
      <template #node-llm="props">
        <LLMNode v-bind="props" />
      </template>
      <template #node-end="props">
        <EndNode v-bind="props" />
      </template>

      <!-- 点阵背景 -->
      <Background variant="dots" :gap="16" :size="1" pattern-color="#cbd5e1" />

      <!-- 小地图 -->
      <MiniMap
        :node-stroke-color="getNodeStrokeColor"
        :node-color="getNodeColor"
        class="of-editor-minimap"
      />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { VueFlow, useVueFlow, type Node } from '@vue-flow/core'
import type { NodeChange, EdgeChange } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import {
  useWorkflowEditorUIStore,
  type PanelType
} from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { OFBlockEnum } from '@preload/types'

// 导入自定义节点组件
import StartNode from './Nodes/StartNode/index.vue'
import LLMNode from './Nodes/LLMNode/index.vue'
import EndNode from './Nodes/EndNode/index.vue'

// 导入 VueFlow 核心样式
import '@vue-flow/core/dist/style.css'
// 导入 minimap 样式
import '@vue-flow/minimap/dist/style.css'

const props = defineProps<{
  workflowId: string | null
}>()

const store = useWorkflowEditorStore()
const uiStore = useWorkflowEditorUIStore()

// 根据节点类型获取 PanelType
function getPanelType(nodeType: string): PanelType | null {
  switch (nodeType) {
    case 'start':
    case OFBlockEnum.Start:
      return 'start-node'
    case 'llm':
    case OFBlockEnum.LLM:
      return 'llm-node'
    case 'end':
    case OFBlockEnum.End:
      return 'end-node'
    default:
      return null
  }
}

// 处理节点点击事件
function handleNodeClick(event: { node: Node }) {
  const clickedNode = event.node
  const nodeId = clickedNode.id
  const nodeType = clickedNode.type || ''
  const panelType = getPanelType(nodeType)

  if (!panelType) {
    return
  }

  // 如果当前已经打开了这个节点的配置面板，则关闭
  if (uiStore.selectedNodeId === nodeId && uiStore.showNodeConfigPanel) {
    uiStore.closeNodeConfigPanel()
  } else {
    // 否则打开该节点的配置面板
    // 需要将 string 转换为 OFBlockEnum
    let ofBlockEnum: OFBlockEnum
    switch (nodeType) {
      case 'start':
        ofBlockEnum = OFBlockEnum.Start
        break
      case 'llm':
        ofBlockEnum = OFBlockEnum.LLM
        break
      case 'end':
        ofBlockEnum = OFBlockEnum.End
        break
      default:
        return
    }
    uiStore.openNodeConfigPanel(nodeId, ofBlockEnum)
  }
}

// 处理连接事件（节点之间的连线）
function handleConnect(params: {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}) {
  store.addEdge({
    id: `edge_${params.source}_${params.target}_${Date.now()}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle
  })
}

// 处理节点拖拽结束（松手时同步位置）
function handleNodeDragStop(event: { node: Node }) {
  const node = event.node
  store.updateNodePosition(node.id, node.position)
}

// 处理节点变化（增删等）
function handleNodesChange(changes: NodeChange[]) {
  store.applyNodeChanges(changes)
}

// 处理边变化（增删等）
function handleEdgesChange(changes: EdgeChange[]) {
  store.applyEdgeChanges(changes)
}

// 使用 VueFlow composable 来同步 viewport
const { onViewportChange, setViewport } = useVueFlow()

// MiniMap 节点颜色函数
// 注意：MiniMap 传入的 node 是 GraphNode 类型，包含 selected 属性
function getNodeStrokeColor(node: Node): string {
  return (node as Node & { selected?: boolean }).selected ? '#10b981' : '#94a3b8'
}

function getNodeColor(node: Node): string {
  return (node as Node & { selected?: boolean }).selected ? '#d1fae5' : '#f1f5f9'
}

// 监听视口变化并同步到 store
onViewportChange((viewport) => {
  store.setViewport(viewport.x, viewport.y, viewport.zoom)
})

// 当 workflowId 变化时加载工作流
watch(
  () => props.workflowId,
  async (newId) => {
    if (newId) {
      await store.loadWorkflow(newId)
      // 加载后恢复 viewport
      setViewport({
        x: store.viewport.x,
        y: store.viewport.y,
        zoom: store.viewport.zoom
      })
    }
  },
  { immediate: true }
)

// 组件挂载时初始化
onMounted(async () => {
  // 如果有 workflowId 则加载
  if (props.workflowId) {
    await store.loadWorkflow(props.workflowId)
    // 加载后恢复 viewport
    setViewport({
      x: store.viewport.x,
      y: store.viewport.y,
      zoom: store.viewport.zoom
    })
  }
})

onUnmounted(() => {
  // 这里目前没有需要清理的 VueFlow 资源
})
</script>
