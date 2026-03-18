<template>
  <div class="relative flex flex-1 min-h-0 overflow-hidden">
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
        <!-- 这里按主工作区 DOM 顺序切换各个 section，避免页面骨架继续平铺在 index.vue。 -->
        <GenerateDashboardPanel
          v-if="generationStore.activeMenu === 'dashboard'"
          :sessions-count="generationStore.sessions.length"
          :planned-sessions-count="generationStore.plannedSessionsCount"
          :current-session-stage-label="generationStore.currentSessionStageLabel"
          :dashboard-stage-cards="generationStore.dashboardStageCards"
        />

        <GenerateSessionsPanel
          v-else-if="generationStore.activeMenu === 'sessions' && generationStore.currentSession"
          :sessions="generationStore.sessions"
          :selected-session-id="generationStore.currentSession.id"
          :stage-order="stageOrder"
          :get-stage-label="generationStore.getStageLabel"
          :get-session-stage-dot-class="generationStore.getSessionStageDotClass"
          @open-create-session="$emit('open-create-session')"
          @select-session="generationStore.selectSession($event)"
          @delete-session="generationStore.deleteSession($event)"
        />

        <GenerateAnalysisPanel
          v-else-if="generationStore.activeMenu === 'analysis' && generationStore.currentSession"
          :session-title="generationStore.currentSession.title"
          :session-summary="generationStore.currentSession.summary"
          :current-session-stage-label="generationStore.currentSessionStageLabel"
          :document="generationStore.currentSession.analysisDocument"
          :messages="generationStore.analysisMessages"
          :analysis-input="generationStore.analysisInput"
          :is-analysis-streaming="generationStore.isAnalysisStreaming"
          @open-sessions="generationStore.activeMenu = 'sessions'"
          @open-copilot="generationStore.openCopilotPanel('analysis')"
          @start-design="generationStore.startDesignFromPlanningMessage($event)"
          @update:document="$emit('update-analysis-document', $event)"
          @update:analysis-input="generationStore.analysisInput = $event"
          @send-analysis-chat="generationStore.sendAnalysisChatMessage()"
          @send-analysis-result="generationStore.sendAnalysisResultMessage()"
        />

        <GenerateDesignPanel
          v-else-if="generationStore.activeMenu === 'design' && generationStore.currentSession"
          :session-title="generationStore.currentSession.title"
          :source-preview="designSourcePreview"
          :active-document="generationStore.activeDesignDocument"
          :design-count="generationStore.currentSession.designDocuments.length"
          :view-mode="generationStore.designDocumentViewMode"
          :diagnostics="currentDesignDiagnostics"
          :local-check-result="generationStore.localCheckResult"
          :selected-diagnostic-index="generationStore.selectedDesignDiagnosticIndex"
          :is-copilot-streaming="generationStore.isActiveCopilotStreaming"
          @create-design="$emit('create-design-document')"
          @update:design-content="$emit('update-design-content', $event)"
          @update:view-mode="generationStore.designDocumentViewMode = $event"
          @compile-workflow="$emit('compile-workflow')"
          @open-copilot="generationStore.openCopilotPanel('design')"
          @start-design="generationStore.startDesignFromDesignPanel()"
          @open-sessions="generationStore.activeMenu = 'sessions'"
          @open-design-manager="generationStore.openDesignManager()"
          @select-diagnostic="generationStore.selectedDesignDiagnosticIndex = $event"
        />

        <GenerateGlobalSettingsPanel
          v-else-if="generationStore.activeMenu === 'settings'"
          :model-value="generationStore.globalSettings.persistRawLlmData"
          @update:model-value="generationStore.updateGlobalSettings({ persistRawLlmData: $event })"
        />
      </div>

      <GeneratePlanDesignPanel
        v-if="generationStore.currentSession"
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
        @abort-message="generationStore.abortStreamingMessage($event)"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GenerationValidationDiagnostic } from '@preload/types'
import { useOrchestflowGenerationEditorStore } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.store'
import type { MenuItem, StageKey } from '../generate-view.types'
import GeneratePlanDesignPanel from '../copilot/GeneratePlanDesignPanel.vue'
import GenerateDashboardPanel from '../sections/dashboard/GenerateDashboardPanel.vue'
import GenerateAnalysisPanel from '../sections/analysis/GenerateAnalysisPanel.vue'
import GenerateDesignPanel from '../sections/design/GenerateDesignPanel.vue'
import GenerateSessionsPanel from '../sections/sessions/GenerateSessionsPanel.vue'
import GenerateGlobalSettingsPanel from '../sections/settings/GenerateGlobalSettingsPanel.vue'
import GenerateSidebar from './GenerateSidebar.vue'

defineProps<{
  basicMenus: MenuItem[]
  workflowMenus: MenuItem[]
  configMenus: MenuItem[]
  stageOrder: StageKey[]
  currentDesignDiagnostics: GenerationValidationDiagnostic[]
  copilotPreviewTitle: string
  copilotPreviewContent: string
}>()

defineEmits<{
  (e: 'open-create-session'): void
  (e: 'update-analysis-document', value: string): void
  (e: 'create-design-document'): void
  (e: 'update-design-content', value: string): void
  (e: 'compile-workflow'): void
}>()

const generationStore = useOrchestflowGenerationEditorStore()

// 设计稿快照：优先展示“绑定的规划输出 message”，找不到再回退 analysisDocument。
// 这样能实现你说的“快照---规划设计稿对绑定”。
const designSourcePreview = computed(() => {
  const session = generationStore.currentSession
  if (!session) return ''
  const sourceMessageId = generationStore.activeDesignDocument?.planningSourceMessageId
  if (sourceMessageId) {
    const sourceMessage = session.messages.find((item) => item.id === sourceMessageId)
    if (sourceMessage?.content?.trim()) {
      return sourceMessage.content
    }
  }
  return session.analysisDocument.content
})
</script>
