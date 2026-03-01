<template>
  <!-- PanelLayer 负责整个编辑器内部布局：Header + 主内容（画布 + 左侧栏等） -->
  <div class="of-editor-panel-layer h-full w-full flex flex-col relative">
    <!-- 顶部 Header -->
    <PanelHeader :auto-save-time="autoSaveTime" />

    <!-- 下面主内容区域：画布 + 左侧栏 / 右侧浮层等 -->
    <div class="of-editor-main flex-1 relative">
      <!-- 节点图层（画布） -->
      <CanvasLayer :workflow-id="props.workflowId" />

      <!-- 左侧工具竖栏（叠在画布上） -->
      <PanelLeftSidebar />

      <!-- 右侧面板区域（预留） -->
      <div class="absolute right-0 top-0 pointer-events-auto">
        <!-- 右侧面板等等其他乱七八糟的浮窗面板 -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import CanvasLayer from '../CanvasLayer/index.vue'
import PanelHeader from './PanelHeader/index.vue'
import PanelLeftSidebar from './PanelLeftSidebar/index.vue'

const props = defineProps<{
  workflowId: string | null
}>()

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

// 组件挂载时初始化
onMounted(() => {
  updateAutoSaveTime()
  timeInterval = setInterval(updateAutoSaveTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>
