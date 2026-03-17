<template>
  <div
    class="of-generate-view of-generate-shell h-full w-full overflow-hidden bg-gray-50 text-gray-800"
  >
    <div class="flex h-full w-full flex-col overflow-hidden font-sans">
      <GenerateHeader
        :current-model-label="generationStore.currentModelLabel"
        @toggle-sidebar="
          generationStore.isLeftSidebarCollapsed = !generationStore.isLeftSidebarCollapsed
        "
        @create-session="openCreateSessionModal"
        @open-config="generationStore.showConfigDrawer = true"
        @open-model-selector="generationStore.showModelSelector = true"
      />

      <!-- 这里保持 page shell 只负责装配 header / workspace / overlays。 -->
      <GenerateWorkspace
        v-if="generationStore.currentSession"
        :basic-menus="basicMenus"
        :workflow-menus="workflowMenus"
        :config-menus="configMenus"
        :stage-order="stageOrder"
        :current-design-diagnostics="currentDesignDiagnostics"
        :copilot-preview-title="copilotPreviewTitle"
        :copilot-preview-content="copilotPreviewContent"
        @open-create-session="openCreateSessionModal"
        @update-analysis-document="handleAnalysisDocumentChange"
        @create-design-document="handleCreateDesignDocument"
        @update-design-content="handleDesignContentChange"
        @compile-workflow="handleCompileWorkflow"
      />

      <div v-else class="flex flex-1 items-center justify-center text-sm text-gray-500">
        {{ generationStore.isLoading ? '正在加载 GenerateView...' : generationStore.errorMessage }}
      </div>
    </div>

    <ModelSelector
      v-if="generationStore.currentStageConfig"
      :visible="generationStore.showModelSelector"
      :current-provider-id="generationStore.currentStageConfig.providerId"
      :current-model-id="generationStore.currentStageConfig.modelId"
      title="选择当前阶段模型"
      @update:visible="generationStore.showModelSelector = $event"
      @select="generationStore.handleStageModelSelect"
    />

    <GenerateConfigDrawer
      v-if="generationStore.currentStageConfig"
      :visible="generationStore.showConfigDrawer"
      :config="generationStore.currentStageConfig"
      @close="generationStore.showConfigDrawer = false"
      @update:memory-rounds="updateCurrentStageConfig({ memoryRounds: $event })"
      @update:max-repair-iterations="updateCurrentStageConfig({ maxRepairIterations: $event })"
      @update:budget-limit-tokens="updateCurrentStageConfig({ budgetLimitTokens: $event })"
    />

    <GenerateCreateSessionDialog
      :visible="generationStore.showCreateSessionModal"
      :model-value="generationStore.newSessionName"
      @update:model-value="generationStore.newSessionName = $event"
      @close="generationStore.showCreateSessionModal = false"
      @confirm="generationStore.createSession()"
    />

    <GenerateDesignManagerDialog
      v-if="generationStore.currentSession"
      :visible="generationStore.showDesignManagerModal"
      :documents="generationStore.currentSession.designDocuments"
      :active-design-document-id="generationStore.activeDesignDocument?.id || null"
      @close="generationStore.closeDesignManager()"
      @create-document="handleCreateDesignDocument"
      @select="handleSelectDesignDocument"
      @delete="generationStore.deleteDesignDocument($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { Activity, FilePenLine, LayoutTemplate, Settings } from 'lucide-vue-next'
import type { GenerationValidationDiagnostic } from '@preload/types'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import { useOrchestflowGenerationEditorStore } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.store'

import GenerateWorkspace from './layout/GenerateWorkspace.vue'
import GenerateHeader from './layout/GenerateHeader.vue'
import GenerateConfigDrawer from './overlays/GenerateConfigDrawer.vue'
import GenerateCreateSessionDialog from './overlays/GenerateCreateSessionDialog.vue'
import GenerateDesignManagerDialog from './overlays/GenerateDesignManagerDialog.vue'
import { runCompileWorkflowAction } from './actions/compile-workflow.action'
import type { MenuItem, StageKey } from './generate-view.types'

const emit = defineEmits<{
  (e: 'open-workflow', workflowId: string): void
}>()

const generationStore = useOrchestflowGenerationEditorStore()

// 顶层菜单仍然放在 page shell，便于 header / workspace 共用同一套导航定义。
const stageOrder: StageKey[] = ['analysis', 'design']
const basicMenus: MenuItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: Activity },
  { value: 'sessions', label: '会话管理', icon: LayoutTemplate }
]
const workflowMenus: MenuItem[] = [
  { value: 'analysis', label: '需求分析', icon: LayoutTemplate },
  { value: 'design', label: '规划设计', icon: FilePenLine }
]
const configMenus: MenuItem[] = [{ value: 'settings', label: '全局配置', icon: Settings }]

const currentDesignDiagnostics = computed<GenerationValidationDiagnostic[]>(() => {
  const payload = generationStore.activeDesignDocument?.validationJson
  if (!payload) return []
  try {
    const parsed = JSON.parse(payload) as {
      diagnostics?: GenerationValidationDiagnostic[]
    }
    return Array.isArray(parsed.diagnostics) ? parsed.diagnostics : []
  } catch {
    return []
  }
})

const copilotPreviewTitle = computed(() => {
  return generationStore.activeRightPanel === 'design'
    ? generationStore.activeDesignDocument?.title || '设计稿正文'
    : '当前分析文档'
})

const copilotPreviewContent = computed(() => {
  return generationStore.activeRightPanel === 'design'
    ? generationStore.activeDesignDocument?.content || ''
    : generationStore.currentSession?.analysisDocument.content || ''
})

let disposeStreamListener: (() => void) | null = null

onMounted(async () => {
  await generationStore.initialize()
  disposeStreamListener = generationStore.bindStreamListener()
})

onUnmounted(() => {
  disposeStreamListener?.()
})

function openCreateSessionModal(): void {
  generationStore.newSessionName = ''
  generationStore.showCreateSessionModal = true
}

async function handleCreateDesignDocument(): Promise<void> {
  await generationStore.createDesignDocument('设计稿')
  generationStore.activeMenu = 'design'
  generationStore.closeDesignManager()
}

async function handleSelectDesignDocument(documentId: string): Promise<void> {
  await generationStore.selectDesignDocument(documentId)
  generationStore.closeDesignManager()
  generationStore.activeMenu = 'design'
}

async function handleAnalysisDocumentChange(content: string): Promise<void> {
  if (!generationStore.currentSession) return
  await generationStore.saveAnalysisDocument({
    ...generationStore.currentSession.analysisDocument,
    content,
    summary: content.split('\n').find((line) => line.trim()) || '已手动编辑分析文档。'
  })
}

async function handleDesignContentChange(content: string): Promise<void> {
  if (!generationStore.activeDesignDocument) return
  await generationStore.saveDesignDocument({
    ...generationStore.activeDesignDocument,
    content,
    status: 'draft',
    summary: '已手动编辑设计稿。'
  })
}

async function handleCompileWorkflow(): Promise<void> {
  await runCompileWorkflowAction({
    compileToWorkflow: () => generationStore.compileDesignDocumentToWorkflow(),
    openWorkflow: (workflowId) => emit('open-workflow', workflowId),
    reportError: (message) => window.alert(message)
  })
}

async function updateCurrentStageConfig(patch: {
  memoryRounds?: number
  maxRepairIterations?: number
  budgetLimitTokens?: number
}): Promise<void> {
  if (!generationStore.currentStageConfig) return
  await generationStore.updateStageConfig({
    ...generationStore.currentStageConfig,
    ...patch
  })
}
</script>

<style scoped src="./generate-view.scss"></style>
