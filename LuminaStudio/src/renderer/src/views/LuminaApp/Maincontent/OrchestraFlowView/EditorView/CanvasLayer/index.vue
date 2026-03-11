<template>
  <div class="of-editor-canvas-layer absolute inset-0">
    <div
      v-if="dropGuardMessage"
      class="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm"
    >
      {{ dropGuardMessage }}
    </div>
    <VueFlow
      :nodes="store.nodes"
      :edges="store.edges"
      :elevate-nodes-on-select="false"
      :default-viewport="{
        x: store.viewport.x,
        y: store.viewport.y,
        zoom: store.viewport.zoom
      }"
      :delete-key-code="null"
      class="of-editor-canvas h-full w-full"
      @node-click="handleNodeClick"
      @connect="handleConnect"
      @node-drag-stop="handleNodeDragStop"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
    >
      <!-- 自定义节点 -->
      <template #node-start="nodeProps">
        <StartNode v-bind="nodeProps" />
      </template>
      <template #node-iteration-start="nodeProps">
        <IterationStartNode v-bind="nodeProps" />
      </template>
      <template #node-loop-start="nodeProps">
        <LoopStartNode v-bind="nodeProps" />
      </template>
      <template #node-llm="nodeProps">
        <LLMNode v-bind="nodeProps" />
      </template>
      <template #node-iteration="nodeProps">
        <IterationNode v-bind="nodeProps" />
      </template>
      <template #node-loop="nodeProps">
        <LoopNode v-bind="nodeProps" />
      </template>
      <template #node-ifelse="nodeProps">
        <IfElseNode v-bind="nodeProps" />
      </template>
      <template #node-variable-assign="nodeProps">
        <VariableAssignNode v-bind="nodeProps" />
      </template>
      <template #node-end="nodeProps">
        <EndNode v-bind="nodeProps" />
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
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { VueFlow, useVueFlow, type Node } from '@vue-flow/core'
import type { NodeChange, EdgeChange } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import {
  useWorkflowEditorUIStore,
  PanelType
} from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { useModelConfigStore } from '@renderer/stores/model-config/store'

// 导入自定义节点组件
import StartNode from './Nodes/StartNode/index.vue'
import IterationStartNode from './Nodes/IterationStartNode/index.vue'
import LoopStartNode from './Nodes/LoopStartNode/index.vue'
import LLMNode from './Nodes/LLMNode/index.vue'
import IterationNode from './Nodes/IterationNode/index.vue'
import LoopNode from './Nodes/LoopNode/index.vue'
import IfElseNode from './Nodes/IfElseNode/index.vue'
import VariableAssignNode from './Nodes/VariableAssignNode/index.vue'
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
const modelConfigStore = useModelConfigStore()
const dropGuardMessage = ref('')
let dropGuardTimer: ReturnType<typeof setTimeout> | null = null

function showDropGuardMessage(message: string) {
  dropGuardMessage.value = message
  if (dropGuardTimer) {
    clearTimeout(dropGuardTimer)
  }
  dropGuardTimer = setTimeout(() => {
    dropGuardMessage.value = ''
    dropGuardTimer = null
  }, 2400)
}

async function loadWorkflowSafely(workflowId: string | null) {
  if (!workflowId) {
    store.unloadWorkflow()
    return
  }

  try {
    await store.loadWorkflow(workflowId)
    setViewport({
      x: store.viewport.x,
      y: store.viewport.y,
      zoom: store.viewport.zoom
    })
  } catch (error) {
    store.unloadWorkflow()
    console.error(`[OrchestraFlow] Failed to load workflow "${workflowId}"`, error)
    alert(`工作流加载失败：${workflowId}`)
  }
}

// 根据节点类型获取 PanelType
function getPanelType(nodeType: string): PanelType | null {
  switch (nodeType) {
    case 'start':
    case OFBlockEnum.Start:
      return PanelType.StartNode
    case 'llm':
    case OFBlockEnum.LLM:
      return PanelType.LLMNode
    case 'iteration-start':
    case OFBlockEnum.IterationStart:
      return null
    case 'loop-start':
    case OFBlockEnum.LoopStart:
      return null
    case 'iteration':
    case OFBlockEnum.Iteration:
      return PanelType.IterationNode
    case 'loop':
    case OFBlockEnum.Loop:
      return PanelType.LoopNode
    case 'ifelse':
    case OFBlockEnum.IfElse:
      return PanelType.IfElseNode
    case 'variable-assign':
    case OFBlockEnum.VariableAssign:
      return PanelType.VariableAssignNode
    case 'end':
    case OFBlockEnum.End:
      return PanelType.EndNode
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

  // 需要将 string 转换为 OFBlockEnum
  let ofBlockEnum: OFBlockEnum
  switch (nodeType) {
    case 'start':
      ofBlockEnum = OFBlockEnum.Start
      break
    case 'llm':
      ofBlockEnum = OFBlockEnum.LLM
      break
    case 'iteration-start':
      return
    case 'loop-start':
      return
    case 'iteration':
      ofBlockEnum = OFBlockEnum.Iteration
      break
    case 'loop':
      ofBlockEnum = OFBlockEnum.Loop
      break
    case 'ifelse':
      ofBlockEnum = OFBlockEnum.IfElse
      break
    case 'variable-assign':
      ofBlockEnum = OFBlockEnum.VariableAssign
      break
    case 'end':
      ofBlockEnum = OFBlockEnum.End
      break
    default:
      return
  }

  // 同节点点击：仅当该面板已是顶层时才关闭，否则提层
  if (uiStore.selectedNodeId === nodeId && uiStore.showNodeConfigPanel) {
    if (uiStore.isPanelActive('node-config')) {
      uiStore.closeNodeConfigPanel()
    } else {
      uiStore.focusPanel('node-config')
    }
    return
  }

  // 不同节点或未打开：打开并置顶
  uiStore.openNodeConfigPanel(nodeId, ofBlockEnum)
}

// 处理连接事件（节点之间的连线）
function handleConnect(params: {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}) {
  const sourceParentId = store.findParentIterationNodeId(params.source)
  const targetParentId = store.findParentIterationNodeId(params.target)

  if (sourceParentId !== targetParentId) {
    return
  }

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
  const parentNodeId = (node as Node & { parentNode?: string }).parentNode
  if (parentNodeId) {
    store.updateIterationChildPosition(parentNodeId, node.id, node.position)
    return
  }

  const hasEdges = store.edges.some((edge) => edge.source === node.id || edge.target === node.id)
  if (!hasEdges && node.type !== 'iteration' && node.type !== 'loop') {
    const dropTarget = store.nodes.find((candidate) => {
      if (
        candidate.id === node.id ||
        candidate.parentNode ||
        (candidate.data.type !== OFBlockEnum.Iteration && candidate.data.type !== OFBlockEnum.Loop)
      ) {
        return false
      }
      const width = candidate.data.width || 650
      const height = candidate.data.height || 417
      const nodeWidth = Number(
        (node as Node & { dimensions?: { width?: number } }).dimensions?.width || 120
      )
      const nodeHeight = Number(
        (node as Node & { dimensions?: { height?: number } }).dimensions?.height || 60
      )
      const centerX = node.position.x + nodeWidth / 2
      const centerY = node.position.y + nodeHeight / 2

      return (
        centerX >= candidate.position.x &&
        centerX <= candidate.position.x + width &&
        centerY >= candidate.position.y &&
        centerY <= candidate.position.y + height
      )
    })

    if (dropTarget) {
      const guard = store.getMoveNodeIntoContainerGuard(node.id, dropTarget.id)
      if (!guard.allowed) {
        if (guard.reason) {
          showDropGuardMessage(guard.reason)
        }
        store.updateNodePosition(node.id, node.position)
        return
      }

      store.moveNodeIntoIterationNode(node.id, dropTarget.id, {
        x: node.position.x - dropTarget.position.x - 16,
        y: node.position.y - dropTarget.position.y - 56
      })
      return
    }
  }

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
const {
  onViewportChange,
  setViewport,
  getSelectedNodes,
  getSelectedEdges,
  removeNodes,
  removeEdges
} = useVueFlow()

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}

function handleDeleteKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (isEditableTarget(event.target)) return
  if (event.key !== 'Delete' && event.key !== 'Backspace') return

  const selectedNodes = getSelectedNodes.value
  const selectedEdges = getSelectedEdges.value

  if (!selectedNodes.length && !selectedEdges.length) {
    return
  }

  event.preventDefault()

  if (selectedEdges.length) {
    removeEdges(selectedEdges)
  }

  if (selectedNodes.length) {
    removeNodes(selectedNodes, true, true)
  }
}

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
    await loadWorkflowSafely(newId)
  },
  { immediate: true }
)

// 组件挂载时初始化
onMounted(async () => {
  window.addEventListener('keydown', handleDeleteKeydown)
  if (modelConfigStore.providers.length === 0) {
    await modelConfigStore.fetchProviders()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDeleteKeydown)
  if (dropGuardTimer) {
    clearTimeout(dropGuardTimer)
  }
})
</script>

<style scoped>
/* ============================
   连接线样式
   ============================ */
.of-editor-canvas :deep(.vue-flow__edge-path) {
  stroke-width: 2px;
}

.of-editor-canvas :deep(.vue-flow__edge.of-edge-iteration) {
  z-index: 7;
}

.of-editor-canvas :deep(.vue-flow__edge.of-edge-iteration .vue-flow__edge-path) {
  stroke: #b9c0cc;
  stroke-width: 2.5px;
}

.of-editor-canvas :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #6ee7b7;
  stroke-width: 3px;
  filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.6));
}

/* ============================
   统一连接点（Handle）管理
   修改以下变量即可全局调整所有节点的连接点位置、大小、指示器
   ============================ */
.of-editor-canvas {
  /* ---- 连接点水平偏移 ---- */
  --of-handle-target-offset: -1px; /* target(左侧输入) 贴住节点边缘，仅保留半线宽居中 */
  --of-handle-source-offset: -1px; /* source(右侧输出) 贴住节点边缘，仅保留半线宽居中 */
  --of-handle-source-far-offset: -1px; /* source 远距变体也贴边，逻辑锚点与指示线统一 */

  /* ---- 连接点大小 ---- */
  --of-handle-width: 2px; /* 真实锚点宽度，与指示器一致 */
  --of-handle-height: 16px; /* 保留纵向可点击高度 */

  /* ---- 连接点默认垂直位置 ---- */
  --of-handle-top: 16px; /* 对应 top-4 (1rem=16px) */

  /* ---- 指示器（青色小条）尺寸 ---- */
  --of-indicator-width: 2px; /* 指示器线条粗细 */
  --of-indicator-height: 8px; /* 指示器线条长度 */
  --of-indicator-top: 4px; /* 指示器相对于 handle 的垂直偏移 */
  --of-indicator-h-offset: 0px; /* 指示器相对于 handle 边缘的水平偏移 */

  /* ---- 连接线与节点的距离 ---- */
  /* 说明：连接线会自动从 Handle 中心点出发，距离节点边缘的距离 = handle offset 的绝对值 */
  /* 如需调整连接线距离，修改上方的 --of-handle-target-offset / --of-handle-source-offset */
}

/* ---- 连接点基础样式 ---- */
.of-editor-canvas :deep(.of-node-handle) {
  z-index: 30;
  width: var(--of-handle-width);
  height: var(--of-handle-height);
  border-radius: 0;
  border: none;
  background: transparent;
  outline: none;
}

/* ---- Target handle（左侧输入）定位 ---- */
.of-editor-canvas :deep(.of-handle-target) {
  left: var(--of-handle-target-offset);
  top: var(--of-handle-top);
  transform: translateY(0);
}

/* ---- Source handle（右侧输出）定位 —— 默认齐边 ---- */
.of-editor-canvas :deep(.of-handle-source) {
  right: var(--of-handle-source-offset);
  top: var(--of-handle-top);
  transform: translateY(0);
}

/* ---- Source handle 远距变体 —— 如 IfElse 多分支，垂直居中于行 ---- */
.of-editor-canvas :deep(.of-handle-source-far) {
  right: var(--of-handle-source-far-offset);
  top: 50%;
  transform: translateY(-50%);
}

/* ---- 指示器伪元素（所有 handle 统一） ---- */
.of-editor-canvas :deep(.of-node-handle::after) {
  content: '';
  position: absolute;
  top: var(--of-indicator-top);
  width: var(--of-indicator-width);
  height: var(--of-indicator-height);
  opacity: 0;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

/* target 指示器在左侧 */
.of-editor-canvas :deep(.of-handle-target::after) {
  left: var(--of-indicator-h-offset);
}

/* source 指示器在右侧 */
.of-editor-canvas :deep(.of-handle-source::after),
.of-editor-canvas :deep(.of-handle-source-far::after) {
  right: var(--of-indicator-h-offset);
}

/* ---- Hover 显示指示器 ---- */
.of-editor-canvas :deep(.of-node:hover .of-node-handle::after) {
  opacity: 1;
}

.of-editor-canvas :deep(.of-node-handle:hover::after) {
  transform: scaleY(1.15);
}
</style>
