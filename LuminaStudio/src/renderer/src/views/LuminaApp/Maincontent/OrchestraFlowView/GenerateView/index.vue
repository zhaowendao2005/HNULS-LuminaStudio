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
              :current-session-stage-label="currentSessionStageLabel"
              :dashboard-stage-cards="generationStore.dashboardStageCards"
            />

            <GenerateSessionsPanel
              v-else-if="generationStore.activeMenu === 'sessions'"
              :sessions="generationStore.sessions"
              :selected-session-id="generationStore.selectedSessionId || ''"
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
              :current-session-stage-label="currentSessionStageLabel"
              :messages="generationStore.analysisMessages"
              :analysis-input="generationStore.analysisInput"
              :is-analysis-streaming="generationStore.isAnalysisStreaming"
              @open-sessions="generationStore.activeMenu = 'sessions'"
              @open-copilot="generationStore.openCopilotPanel('analysis')"
              @update:analysis-input="generationStore.analysisInput = $event"
              @send-analysis="generationStore.sendAnalysisMessage()"
            />

            <GenerateDesignPanel
              v-else-if="generationStore.activeMenu === 'design'"
              :session-title="generationStore.currentSession.title"
              :file-name="generationStore.currentSession.documents.design.fileName"
              :design-content="generationStore.currentSession.documents.design.content"
              @update:design-content="generationStore.handleDesignContentUpdate($event)"
              @open-copilot="generationStore.openCopilotPanel('design')"
              @open-sessions="generationStore.activeMenu = 'sessions'"
            />

            <GenerateVerifyPanel
              v-else-if="generationStore.activeMenu === 'verify'"
              :session-title="generationStore.currentSession.title"
              :file-name="generationStore.currentSession.documents.verify.fileName"
              :verify-content="generationStore.currentSession.documents.verify.content"
              @open-copilot="generationStore.openCopilotPanel('verify')"
              @open-sessions="generationStore.activeMenu = 'sessions'"
            />

            <div v-else class="p-6 text-[13px] text-gray-500">
              {{ generationStore.activeMenu }} 模块开发中，当前选中会话：{{
                generationStore.currentSession.title
              }}。
            </div>
          </div>

          <GeneratePlanDesignPanel
            :visible="generationStore.activeRightPanel !== null"
            :is-fullscreen="generationStore.isRightPanelFullscreen"
            :mode="generationStore.activeRightPanel || 'analysis'"
            :session-title="generationStore.currentSession.title"
            :document="generationStore.activeCopilotDocument"
            :messages="generationStore.activeCopilotMessages"
            :auto-approved="currentCopilotAutoApproved"
            :copilot-input="generationStore.copilotInput"
            :is-streaming="generationStore.isActiveCopilotStreaming"
            @toggle-auto-approved="generationStore.toggleAutoApproved()"
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
        正在加载 GenerateView...
      </div>
    </div>

    <ModelSelector
      v-if="generationStore.currentSession"
      :visible="generationStore.showModelSelector"
      :current-provider-id="generationStore.currentStageConfig?.providerId || null"
      :current-model-id="generationStore.currentStageConfig?.modelId || null"
      title="选择当前阶段模型"
      search-placeholder="搜索公共模型..."
      hint-text="选择后会作用于当前阶段视图，并持久化到生成编辑器数据库"
      @update:visible="generationStore.showModelSelector = $event"
      @select="generationStore.handleStageModelSelect"
    />

    <GenerateConfigDrawer
      v-if="generationStore.currentSession"
      :visible="generationStore.showConfigDrawer"
      :active-tab="generationStore.configDrawerTab"
      :model-config-label="generationStore.modelConfigLabel"
      :analysis-config="{
        discussionMemory: generationStore.currentSession.stageConfigs.analysis.memoryRounds,
        copilotMemory: generationStore.currentSession.stageConfigs.analysis.copilotMemoryRounds
      }"
      :design-config="{
        designMemory: generationStore.currentSession.stageConfigs.design.memoryRounds,
        copilotMemory: generationStore.currentSession.stageConfigs.design.copilotMemoryRounds
      }"
      :verify-config="{
        verifyMemory: generationStore.currentSession.stageConfigs.verify.memoryRounds,
        copilotMemory: generationStore.currentSession.stageConfigs.verify.copilotMemoryRounds
      }"
      @close="generationStore.showConfigDrawer = false"
      @change-tab="generationStore.configDrawerTab = $event"
      @update:analysis-discussion-memory="
        generationStore.saveConfigDrawerStageConfig({ memoryRounds: $event })
      "
      @update:analysis-copilot-memory="
        generationStore.saveConfigDrawerStageConfig({ copilotMemoryRounds: $event })
      "
      @update:design-memory="generationStore.saveConfigDrawerStageConfig({ memoryRounds: $event })"
      @update:design-copilot-memory="
        generationStore.saveConfigDrawerStageConfig({ copilotMemoryRounds: $event })
      "
      @update:verify-memory="generationStore.saveConfigDrawerStageConfig({ memoryRounds: $event })"
      @update:verify-copilot-memory="
        generationStore.saveConfigDrawerStageConfig({ copilotMemoryRounds: $event })
      "
    />

    <GenerateCreateSessionDialog
      :visible="generationStore.showCreateSessionModal"
      :model-value="generationStore.newSessionName"
      @update:model-value="generationStore.newSessionName = $event"
      @close="generationStore.showCreateSessionModal = false"
      @confirm="generationStore.createSession()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import {
  Activity,
  CheckCircle,
  GitBranch,
  LayoutTemplate,
  MessageSquare,
  Settings
} from 'lucide-vue-next'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import { useOrchestflowGenerationEditorStore } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.store'
import GenerateAnalysisPanel from './GenerateAnalysisPanel.vue'
import GenerateConfigDrawer from './GenerateConfigDrawer.vue'
import GenerateCreateSessionDialog from './GenerateCreateSessionDialog.vue'
import GenerateDashboardPanel from './GenerateDashboardPanel.vue'
import GenerateDesignPanel from './GenerateDesignPanel.vue'
import GenerateHeader from './GenerateHeader.vue'
import GeneratePlanDesignPanel from './GeneratePlanDesignPanel.vue'
import GenerateSessionsPanel from './GenerateSessionsPanel.vue'
import GenerateSidebar from './GenerateSidebar.vue'
import GenerateVerifyPanel from './GenerateVerifyPanel.vue'
import type { MenuItem, StageKey } from './generate-view.types'

const generationStore = useOrchestflowGenerationEditorStore()
const stageOrder: StageKey[] = ['analysis', 'design', 'verify', 'workflow']

const basicMenus: MenuItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: Activity },
  { value: 'sessions', label: '会话管理', icon: MessageSquare }
]

const workflowMenus: MenuItem[] = [
  { value: 'analysis', label: '需求分析与计划', icon: GitBranch },
  { value: 'design', label: '规划设计', icon: LayoutTemplate },
  { value: 'verify', label: '校验', icon: CheckCircle }
]

const configMenus: MenuItem[] = [{ value: 'settings', label: '全局配置', icon: Settings }]

const currentSessionStageLabel = computed(() => {
  if (!generationStore.currentSession) return '未完成需求分析'
  return generationStore.getStageLabel(generationStore.currentSession.currentStage)
})

const currentCopilotAutoApproved = computed(() => {
  if (!generationStore.currentSession || !generationStore.activeRightPanel) return true
  return generationStore.currentSession.stageConfigs[generationStore.activeRightPanel].autoApproved
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
</script>

<style scoped src="./generate-view.scss"></style>
