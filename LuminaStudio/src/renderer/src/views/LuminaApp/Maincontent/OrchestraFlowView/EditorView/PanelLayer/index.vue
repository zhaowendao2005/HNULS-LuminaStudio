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
        :z-index="systemPanelStyle.zIndex"
        :offset-x="systemPanelStyle.offsetX"
        :active="uiStore.isPanelActive('system-variables')"
        title="系统变量"
        description="系统变量是全局变量，在类型匹配时无需连线即可被任意节点引用，例如终端用户 ID 和工作流 ID。"
        @close="uiStore.closeSystemVariablesPanel"
        @focus="focusSystemVariablesPanel"
      >
        <SystemVariablesPanel />
      </FloatingPanel>

      <!-- 节点配置面板 -->
      <FloatingPanel
        :visible="uiStore.showNodeConfigPanel"
        :z-index="nodeConfigPanelStyle.zIndex"
        :offset-x="nodeConfigPanelStyle.offsetX"
        :active="uiStore.isPanelActive('node-config')"
        :theme-class="nodeConfigPanelThemeClass"
        :title="panelTitle"
        :description="panelDescription"
        @close="uiStore.closeNodeConfigPanel"
        @focus="focusNodeConfigPanel"
      >
        <StartNodePanel v-if="uiStore.currentPanelType === 'start-node'" />
        <LLMNodePanel v-else-if="uiStore.currentPanelType === 'llm-node'" />
        <IterationNodePanel v-else-if="uiStore.currentPanelType === 'iteration-node'" />
        <LoopNodePanel v-else-if="uiStore.currentPanelType === 'loop-node'" />
        <IfElseNodePanel v-else-if="uiStore.currentPanelType === 'ifelse-node'" />
        <VariableAssignNodePanel v-else-if="uiStore.currentPanelType === 'variable-assign-node'" />
        <KnowledgeRetrievalNodePanel
          v-else-if="uiStore.currentPanelType === 'knowledge-retrieval-node'"
        />
        <PaperRetrievalNodePanel v-else-if="uiStore.currentPanelType === 'paper-retrieval-node'" />
        <EndNodePanel v-else-if="uiStore.currentPanelType === 'end-node'" />
      </FloatingPanel>

      <!-- 运行结果面板 -->
      <WorkflowRunPanel
        :visible="uiStore.showWorkflowRunPanel"
        :z-index="workflowRunPanelStyle.zIndex"
        :offset-x="workflowRunPanelStyle.offsetX"
        :active="uiStore.isPanelActive('workflow-run')"
        @close="uiStore.closeWorkflowRunPanel"
        @focus="focusWorkflowRunPanel"
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
import IterationNodePanel from './FloatingPanel/IterationNodePanel.vue'
import LoopNodePanel from './FloatingPanel/LoopNodePanel/index.vue'
import IfElseNodePanel from './FloatingPanel/IfElseNodePanel.vue'
import VariableAssignNodePanel from './FloatingPanel/VariableAssignNodePanel.vue'
import KnowledgeRetrievalNodePanel from './FloatingPanel/KnowledgeRetrievalNodePanel/index.vue'
import PaperRetrievalNodePanel from './FloatingPanel/PaperRetrievalNodePanel/index.vue'
import EndNodePanel from './FloatingPanel/EndNodePanel.vue'
import VariableSelector from './FloatingPanel/VariableSelector/index.vue'
import WorkflowRunPanel from './FloatingPanel/WorkflowRunPanel/index.vue'
import { OF_PANEL_THEME } from './FloatingPanel/panel-theme'
import {
  useWorkflowEditorUIStore,
  PanelType
} from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'

const props = defineProps<{
  workflowId: string | null
}>()

// UI 状态 Store
const uiStore = useWorkflowEditorUIStore()

const systemPanelStyle = computed(() => uiStore.getPanelStyle('system-variables'))
const nodeConfigPanelStyle = computed(() => uiStore.getPanelStyle('node-config'))
const workflowRunPanelStyle = computed(() => uiStore.getPanelStyle('workflow-run'))
const nodeConfigPanelThemeClass = computed(() => {
  switch (uiStore.currentPanelType) {
    case PanelType.StartNode:
      return OF_PANEL_THEME.start.panelClass
    case PanelType.LLMNode:
      return OF_PANEL_THEME.llm.panelClass
    case PanelType.IterationNode:
      return OF_PANEL_THEME.iteration.panelClass
    case PanelType.LoopNode:
      return OF_PANEL_THEME.loop.panelClass
    case PanelType.IfElseNode:
      return OF_PANEL_THEME.ifelse.panelClass
    case PanelType.VariableAssignNode:
      return OF_PANEL_THEME.variableAssign.panelClass
    case PanelType.KnowledgeRetrievalNode:
      return OF_PANEL_THEME.knowledgeRetrieval.panelClass
    case PanelType.PaperRetrievalNode:
      return OF_PANEL_THEME.paperRetrieval.panelClass
    case PanelType.EndNode:
      return OF_PANEL_THEME.end.panelClass
    default:
      return ''
  }
})

// 根据面板类型计算标题
const panelTitle = computed(() => {
  switch (uiStore.currentPanelType) {
    case PanelType.StartNode:
      return '开始'
    case PanelType.LLMNode:
      return 'LLM'
    case PanelType.IterationNode:
      return '迭代'
    case PanelType.IfElseNode:
      return '条件分支'
    case PanelType.VariableAssignNode:
      return '变量赋值'
    case PanelType.KnowledgeRetrievalNode:
      return '知识检索'
    case PanelType.PaperRetrievalNode:
      return '论文检索'
    case PanelType.EndNode:
      return '结束'
    case PanelType.LoopNode:
      return '循环'
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
    case PanelType.IterationNode:
      return '迭代容器节点，用于模拟多轮内部循环'
    case PanelType.IfElseNode:
      return '按 IF / ELIF / ELSE 规则判断条件并放行命中的分支'
    case PanelType.VariableAssignNode:
      return '对变量做赋值、类型转换和新变量生成'
    case PanelType.KnowledgeRetrievalNode:
      return '按知识库权限范围执行语义检索，并向下游输出命中结果'
    case PanelType.PaperRetrievalNode:
      return '按 provider 配置执行论文检索，并输出结构化论文结果'
    case PanelType.EndNode:
      return '工作流结束节点，用于输出结果'
    case PanelType.LoopNode:
      return '循环容器节点，用于管理循环变量、终止条件与循环体子图'
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

function focusSystemVariablesPanel(): void {
  uiStore.focusPanel('system-variables')
}

function focusNodeConfigPanel(): void {
  uiStore.focusPanel('node-config')
}

function focusWorkflowRunPanel(): void {
  uiStore.focusPanel('workflow-run')
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
