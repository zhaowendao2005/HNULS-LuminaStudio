<template>
  <!-- PanelLayer 负责整个编辑器内部布局：Header + 主内容（画布 + 左侧栏等） -->
  <div class="of-editor-panel-layer h-full w-full flex flex-col relative">
    <!-- 顶部 Header -->
    <PanelHeader
      :auto-save-time="autoSaveTime"
      @open-system-variables="uiStore.openSystemVariablesPanel"
    />

    <!-- 下面主内容区域：画布 + 左侧栏 / 右侧浮层等 -->
    <div class="of-editor-main flex-1 relative">
      <!-- 节点图层（画布） -->
      <CanvasLayer :workflow-id="props.workflowId" />

      <!-- 左侧工具竖栏（叠在画布上） -->
      <PanelLeftSidebar />

      <!-- 右侧浮窗面板 -->
      <FloatingPanel
        :visible="uiStore.showSystemVariablesPanel"
        title="系统变量"
        description="系统变量是全局变量，在类型匹配时无需连线即可被任意节点引用，例如终端用户 ID 和工作流 ID。"
        @close="uiStore.closeSystemVariablesPanel"
      >
        <SystemVariablesPanel />
      </FloatingPanel>

      <!-- 节点配置面板 -->
      <FloatingPanel
        :visible="uiStore.showNodeConfigPanel"
        :title="panelTitle"
        :description="panelDescription"
        @close="uiStore.closeNodeConfigPanel"
      >
        <StartNodePanel v-if="uiStore.currentPanelType === 'start-node'" />
        <LLMNodePanel v-else-if="uiStore.currentPanelType === 'llm-node'" />
        <EndNodePanel v-else-if="uiStore.currentPanelType === 'end-node'" />
      </FloatingPanel>

      <!-- 运行结果面板 -->
      <WorkflowRunPanel
        :visible="uiStore.showWorkflowRunPanel"
        @close="uiStore.closeWorkflowRunPanel"
      />

      <!-- 变量选择器 -->
      <VariableSelector />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import CanvasLayer from '../CanvasLayer/index.vue'
import PanelHeader from './PanelHeader/index.vue'
import PanelLeftSidebar from './PanelLeftSidebar/index.vue'
import FloatingPanel from './FloatingPanel/index.vue'
import SystemVariablesPanel from './FloatingPanel/SystemVariablesPanel.vue'
import StartNodePanel from './FloatingPanel/StartNodePanel/index.vue'
import LLMNodePanel from './FloatingPanel/LLMNodePanel.vue'
import EndNodePanel from './FloatingPanel/EndNodePanel.vue'
import VariableSelector from './FloatingPanel/VariableSelector/index.vue'
import WorkflowRunPanel from './FloatingPanel/WorkflowRunPanel/index.vue'
import {
  useWorkflowEditorUIStore,
  PanelType
} from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'

const props = defineProps<{
  workflowId: string | null
}>()

// UI 状态 Store
const uiStore = useWorkflowEditorUIStore()

// 根据面板类型计算标题
const panelTitle = computed(() => {
  switch (uiStore.currentPanelType) {
    case PanelType.StartNode:
      return '开始'
    case PanelType.LLMNode:
      return 'LLM'
    case PanelType.EndNode:
      return '结束'
    default:
      return ''
  }
})

// 根据面板类型计算描述
const panelDescription = computed(() => {
  switch (uiStore.currentPanelType) {
    case PanelType.StartNode:
      return '工作流开始节点，用于接收用户输入'
    case PanelType.LLMNode:
      return '大语言模型节点，用于生成文本内容'
    case PanelType.EndNode:
      return '工作流结束节点，用于输出结果'
    default:
      return ''
  }
})

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
