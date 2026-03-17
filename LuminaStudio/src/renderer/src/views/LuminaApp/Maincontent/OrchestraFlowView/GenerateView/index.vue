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

      <div v-if="generationStore.currentSession" class="relative flex flex-1 overflow-hidden">
        <GenerateSidebar
          :collapsed="generationStore.isLeftSidebarCollapsed"
          :active-menu="generationStore.activeMenu"
          :basic-menus="basicMenus"
          :workflow-menus="workflowMenus"
          :config-menus="configMenus"
          @change-menu="generationStore.activeMenu = $event"
        />

        <main class="relative flex flex-1 overflow-hidden bg-white">
          <div
            :class="[
              'flex-1 overflow-y-auto transition-all duration-300',
              generationStore.isRightPanelFullscreen ? 'hidden' : 'block'
            ]"
          >
            <GenerateDashboardPanel
              v-if="generationStore.activeMenu === 'dashboard'"
              :sessions-count="generationStore.sessions.length"
              :planned-sessions-count="generationStore.plannedSessionsCount"
              :current-session-stage-label="generationStore.currentSessionStageLabel"
              :dashboard-stage-cards="generationStore.dashboardStageCards"
            />

            <GenerateSessionsPanel
              v-else-if="generationStore.activeMenu === 'sessions'"
              :sessions="generationStore.sessions"
              :selected-session-id="generationStore.currentSession.id"
              :stage-order="stageOrder"
              :get-stage-label="generationStore.getStageLabel"
              :get-session-stage-dot-class="generationStore.getSessionStageDotClass"
              @open-create-session="openCreateSessionModal"
              @select-session="generationStore.selectSession($event)"
              @delete-session="generationStore.deleteSession($event)"
            />

            <GenerateAnalysisPanel
              v-else-if="generationStore.activeMenu === 'analysis'"
              :session-title="generationStore.currentSession.title"
              :session-summary="generationStore.currentSession.summary"
              :current-session-stage-label="generationStore.currentSessionStageLabel"
              :document="generationStore.currentSession.analysisDocument"
              :messages="generationStore.analysisMessages"
              :analysis-input="generationStore.analysisInput"
              :is-analysis-streaming="generationStore.isAnalysisStreaming"
              @open-sessions="generationStore.activeMenu = 'sessions'"
              @open-copilot="generationStore.openCopilotPanel('analysis')"
              @update:document="handleAnalysisDocumentChange"
              @update:analysis-input="generationStore.analysisInput = $event"
              @send-analysis="generationStore.sendAnalysisMessage()"
            />

            <GenerateDesignPanel
              v-else-if="generationStore.activeMenu === 'design'"
              :session-title="generationStore.currentSession.title"
              :source-preview="generationStore.currentSession.analysisDocument.content"
              :active-document="generationStore.activeDesignDocument"
              :design-count="generationStore.currentSession.designDocuments.length"
              :view-mode="generationStore.designDocumentViewMode"
              :diagnostics="currentDesignDiagnostics"
              :selected-diagnostic-index="generationStore.selectedDesignDiagnosticIndex"
              :is-copilot-streaming="generationStore.isActiveCopilotStreaming"
              @create-design="handleCreateDesignDocument"
              @update:design-content="handleDesignContentChange"
              @update:view-mode="generationStore.designDocumentViewMode = $event"
              @compile-workflow="handleCompileWorkflow"
              @open-copilot="generationStore.openCopilotPanel('design')"
              @open-sessions="generationStore.activeMenu = 'sessions'"
              @open-design-manager="generationStore.openDesignManager()"
              @select-diagnostic="generationStore.selectedDesignDiagnosticIndex = $event"
            />

            <GenerateGlobalSettingsPanel
              v-else-if="generationStore.activeMenu === 'settings'"
              :model-value="generationStore.globalSettings.persistRawLlmData"
              @update:model-value="
                generationStore.updateGlobalSettings({ persistRawLlmData: $event })
              "
            />
          </div>

          <GeneratePlanDesignPanel
            :visible="generationStore.activeRightPanel !== null"
            :is-fullscreen="generationStore.isRightPanelFullscreen"
            :mode="generationStore.activeRightPanel || 'analysis'"
            :session-title="generationStore.currentSession.title"
            :preview-title="copilotPreviewTitle"
            :preview-content="copilotPreviewContent"
            :messages="generationStore.activeCopilotMessages"
            :copilot-input="generationStore.copilotInput"
            :is-streaming="generationStore.isActiveCopilotStreaming"
            @toggle-fullscreen="
              generationStore.isRightPanelFullscreen = !generationStore.isRightPanelFullscreen
            "
            @close="generationStore.closeRightPanel()"
            @update:copilot-input="generationStore.copilotInput = $event"
            @send-copilot-message="generationStore.sendCopilotMessage()"
          />
        </main>
      </div>

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
import GenerateAnalysisPanel from './GenerateAnalysisPanel.vue'
import GenerateConfigDrawer from './GenerateConfigDrawer.vue'
import GenerateCreateSessionDialog from './GenerateCreateSessionDialog.vue'
import GenerateDashboardPanel from './GenerateDashboardPanel.vue'
import GenerateDesignManagerDialog from './GenerateDesignManagerDialog.vue'
import GenerateDesignPanel from './GenerateDesignPanel.vue'
import GenerateGlobalSettingsPanel from './GenerateGlobalSettingsPanel.vue'
import GenerateHeader from './GenerateHeader.vue'
import GeneratePlanDesignPanel from './GeneratePlanDesignPanel.vue'
import GenerateSessionsPanel from './GenerateSessionsPanel.vue'
import GenerateSidebar from './GenerateSidebar.vue'
import { runCompileWorkflowAction } from './compile-workflow.action'
import type { MenuItem, StageKey } from './generate-view.types'

const emit = defineEmits<{
  (e: 'open-workflow', workflowId: string): void
}>()

const generationStore = useOrchestflowGenerationEditorStore()
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
