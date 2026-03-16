<template>
  <div class="gv-shell-m01 flex h-full w-full flex-col overflow-hidden bg-slate-100 text-slate-900">
    <GenerateHeader
      @create-session="handleCreateSession"
      @open-config="generationStore.showConfigDrawer = true"
      @open-model-selector="generationStore.showModelSelector = true"
    />

    <div v-if="generationStore.currentSession" class="flex min-h-0 flex-1 overflow-hidden">
      <GenerateSidebar
        :menus="menus"
        :active-menu="generationStore.activeMenu"
        @change-menu="generationStore.activeMenu = $event"
      />

      <main class="flex min-h-0 flex-1 overflow-hidden bg-slate-100">
        <div class="min-h-0 flex-1 overflow-y-auto">
          <GenerateSessionsPanel
            v-if="generationStore.activeMenu === 'sessions'"
            :sessions="generationStore.sessions"
            :selected-session-id="generationStore.currentSession.id"
            @create-session="handleCreateSession"
            @select-session="generationStore.selectSession($event)"
            @delete-session="generationStore.deleteSession($event)"
          />

          <GenerateAnalysisPanel
            v-else-if="generationStore.activeMenu === 'analysis'"
            :document="generationStore.currentSession.analysisDocument"
            :analysis-messages="generationStore.analysisMessages"
            :planning-messages="generationStore.planningCopilotMessages"
            :analysis-input="generationStore.analysisInput"
            :planning-input="generationStore.planningCopilotInput"
            @update:document="handleAnalysisDocumentChange"
            @update:analysis-input="generationStore.analysisInput = $event"
            @update:planning-input="generationStore.planningCopilotInput = $event"
            @send-analysis="generationStore.sendMessage('analysis-planner', generationStore.analysisInput)"
            @send-planning="
              generationStore.sendMessage('planning-copilot', generationStore.planningCopilotInput)
            "
            @create-design="handleCreateDesignDocument"
          />

          <GenerateDesignPanel
            v-else-if="generationStore.activeMenu === 'design'"
            :documents="generationStore.currentSession.designDocuments"
            :active-document="generationStore.activeDesignDocument"
            :design-messages="generationStore.designMessages"
            :design-input="generationStore.designInput"
            @create-design="handleCreateDesignDocument"
            @compile-workflow="handleCompileWorkflow"
            @select-document="generationStore.selectDesignDocument($event)"
            @delete-document="generationStore.deleteDesignDocument($event)"
            @update:content="handleDesignContentChange"
            @update:design-input="generationStore.designInput = $event"
            @send-design="generationStore.sendMessage('design-planner', generationStore.designInput)"
          />

          <GenerateGlobalSettingsPanel
            v-else
            :model-value="generationStore.globalSettings.persistRawLlmData"
            @update:model-value="generationStore.updateGlobalSettings({ persistRawLlmData: $event })"
          />
        </div>

        <GenerateRunInspectorPanel :run="generationStore.inspectorStore.selectedRun" />
      </main>
    </div>

    <div v-else class="flex flex-1 items-center justify-center text-sm text-slate-500">
      {{ generationStore.isLoading ? '正在加载 GenerateView...' : generationStore.errorMessage }}
    </div>

    <ModelSelector
      v-if="generationStore.currentStageConfig"
      :visible="generationStore.showModelSelector"
      :current-provider-id="generationStore.currentStageConfig.providerId"
      :current-model-id="generationStore.currentStageConfig.modelId"
      title="选择当前阶段模型"
      @update:visible="generationStore.showModelSelector = $event"
      @select="handleSelectModel"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { LayoutList, FilePenLine, ScrollText, Settings } from 'lucide-vue-next'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import { useOrchestflowGenerationEditorStore } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.store'
import GenerateAnalysisPanel from './GenerateAnalysisPanel.vue'
import GenerateConfigDrawer from './GenerateConfigDrawer.vue'
import GenerateDesignPanel from './GenerateDesignPanel.vue'
import GenerateGlobalSettingsPanel from './GenerateGlobalSettingsPanel.vue'
import GenerateHeader from './GenerateHeader.vue'
import GenerateRunInspectorPanel from './GenerateRunInspectorPanel.vue'
import GenerateSessionsPanel from './GenerateSessionsPanel.vue'
import GenerateSidebar from './GenerateSidebar.vue'
import { runCompileWorkflowAction } from './compile-workflow.action'
import type { MenuItem } from './generate-view.types'

const emit = defineEmits<{
  (e: 'open-workflow', workflowId: string): void
}>()

const generationStore = useOrchestflowGenerationEditorStore()

const menus: MenuItem[] = [
  { value: 'sessions', label: '会话', icon: LayoutList },
  { value: 'analysis', label: 'Analysis', icon: ScrollText },
  { value: 'design', label: 'Design', icon: FilePenLine },
  { value: 'settings', label: '设置', icon: Settings }
]

let disposeStreamListener: (() => void) | null = null

onMounted(async () => {
  await generationStore.initialize()
  disposeStreamListener = generationStore.bindStreamListener()
})

onUnmounted(() => {
  disposeStreamListener?.()
})

async function handleCreateSession(): Promise<void> {
  const title = window.prompt('输入新会话标题', generationStore.newSessionTitle) || ''
  generationStore.newSessionTitle = title
  await generationStore.createSession()
}

async function handleCreateDesignDocument(): Promise<void> {
  await generationStore.createDesignDocument('设计稿')
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

async function handleSelectModel(payload: {
  provider: { id: string }
  model: { id: string }
}): Promise<void> {
  if (!generationStore.currentStageConfig) return
  await generationStore.updateStageConfig({
    ...generationStore.currentStageConfig,
    providerId: payload.provider.id,
    modelId: payload.model.id
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
