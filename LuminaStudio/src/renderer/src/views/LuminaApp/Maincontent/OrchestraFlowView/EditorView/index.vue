<template>
  <div class="of-editor h-full w-full flex flex-col">
    <!-- Headers 区域：顶部工具栏 -->
    <div class="flex-shrink-0 pointer-events-auto overflow-x-auto z-20">
      <div class="flex items-center justify-between px-4 py-2 min-w-fit">
        <!-- 左对齐：自动保存状态 -->
        <div class="text-sm text-gray-600 flex-shrink-0">
          <span>自动保存</span>
          <span class="mx-1">·</span>
          <span>{{ autoSaveTime }}</span>
          <span class="mx-1">·</span>
          <span class="text-gray-500">未发布</span>
        </div>

        <!-- 右对齐：圆角 SVG 图标按钮 -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- 测试运行按钮（淡绿色） -->
          <button
            class="relative group flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors border border-green-200"
            title="测试运行 Alt R"
          >
            <svg
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
              />
            </svg>
            <span class="text-sm font-medium">测试运行</span>
            <span class="text-xs opacity-75">Alt R</span>
          </button>

          <!-- 分隔线 -->
          <div class="w-px h-6 bg-gray-300"></div>

          <!-- 测试历史按钮 -->
          <button
            class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
            title="测试历史"
          >
            <svg
              class="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          <!-- 检查清单按钮 -->
          <button
            class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
            title="检查清单"
          >
            <svg
              class="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <!-- 环境变量按钮 -->
          <button
            class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
            title="环境变量"
          >
            <span class="text-xs font-medium text-gray-700">ENV</span>
          </button>

          <!-- 系统变量按钮 -->
          <button
            class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
            title="系统变量"
          >
            <span class="text-xs font-medium text-gray-700">X</span>
          </button>

          <!-- 发布按钮（淡绿色，带下拉箭头） -->
          <button
            class="relative group flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors border border-green-200"
            title="发布"
          >
            <span class="text-sm font-medium">发布</span>
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- 历史按钮 -->
          <button
            class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
            title="历史"
          >
            <svg
              class="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区域：包含左侧栏和 VueFlow 画布 -->
    <div class="flex-1 relative">
      <!-- 左侧工具竖栏 -->
      <div
        class="absolute -left-2 -top-0 bottom-0 pointer-events-auto w-12 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col p-2 z-10"
      >
        <div class="flex-1 overflow-y-auto flex flex-col items-start gap-1.5">
          <!-- 这里放置圆角 SVG 小按钮 -->
          <!-- 示例按钮 -->
          <button
            class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
            title="工具1"
          >
            <svg
              class="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- VueFlow 画布容器 -->
      <VueFlow
        v-model:nodes="store.nodes"
        v-model:edges="store.edges"
        :default-viewport="{ x: store.viewport.x, y: store.viewport.y, zoom: store.viewport.zoom }"
        class="of-editor-canvas"
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

      <!-- 面板层：覆盖在画布上方（用于其他浮窗面板） -->
      <div class="absolute inset-0 z-10 pointer-events-none">
        <!-- 右侧面板区域 -->
        <div class="absolute right-0 top-0 pointer-events-auto">
          <!-- 右侧面板等等其他乱七八糟的浮窗面板 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, ref, onUnmounted } from 'vue'
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

defineEmits<{
  (e: 'back'): void
}>()

const store = useWorkflowEditorStore()

// 使用 VueFlow composable 来同步 viewport
const { onViewportChange, setViewport } = useVueFlow()

// 自动保存时间
const autoSaveTime = ref('')
let timeInterval: ReturnType<typeof setInterval> | null = null

function updateAutoSaveTime(): void {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  autoSaveTime.value = `${hours}:${minutes}:${seconds}`
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
  // 初始化自动保存时间并每秒更新
  updateAutoSaveTime()
  timeInterval = setInterval(updateAutoSaveTime, 1000)

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
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>
