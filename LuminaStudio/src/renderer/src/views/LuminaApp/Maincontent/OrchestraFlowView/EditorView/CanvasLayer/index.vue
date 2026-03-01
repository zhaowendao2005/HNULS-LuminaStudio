<template>
  <div class="of-editor-canvas-layer absolute inset-0">
    <VueFlow
      v-model:nodes="store.nodes"
      v-model:edges="store.edges"
      :default-viewport="{
        x: store.viewport.x,
        y: store.viewport.y,
        zoom: store.viewport.zoom
      }"
      class="of-editor-canvas h-full w-full"
    >
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
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'

// 导入 VueFlow 核心样式
import '@vue-flow/core/dist/style.css'
// 导入 minimap 样式
import '@vue-flow/minimap/dist/style.css'

const props = defineProps<{
  workflowId: string | null
}>()

const store = useWorkflowEditorStore()

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
