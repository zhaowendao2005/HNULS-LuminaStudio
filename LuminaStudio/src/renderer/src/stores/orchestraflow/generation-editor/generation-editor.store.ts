import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  GenerationAnalysisDocument,
  GenerationChannelKey,
  GenerationDesignDocument,
  GenerationGlobalSettings,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'
import { OrchestflowGenerationEditorDataSource } from './generation-editor.datasource'
import { useGenerationRunInspectorStore } from './inspector/run-inspector.store'

function requireData<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'GenerateView 请求失败')
  }
  return response.data
}

export const useOrchestflowGenerationEditorStore = defineStore(
  'orchestflow-generation-editor',
  () => {
    const inspectorStore = useGenerationRunInspectorStore()

    const sessions = ref<GenerationSessionSummary[]>([])
    const currentSession = ref<GenerationSessionDetail | null>(null)
    const activeMenu = ref<'sessions' | 'analysis' | 'design' | 'settings'>('sessions')
    const analysisInput = ref('')
    const planningCopilotInput = ref('')
    const designInput = ref('')
    const isLoading = ref(false)
    const errorMessage = ref<string | null>(null)
    const showModelSelector = ref(false)
    const showConfigDrawer = ref(false)
    const globalSettings = ref<GenerationGlobalSettings>({
      persistRawLlmData: false
    })
    const newSessionTitle = ref('新建工作流方案')

    const activeDesignDocument = computed<GenerationDesignDocument | null>(() => {
      if (!currentSession.value) return null
      return (
        currentSession.value.designDocuments.find(
          (item) => item.id === currentSession.value?.selectedDesignDocumentId
        ) ||
        currentSession.value.designDocuments[0] ||
        null
      )
    })

    const currentStageConfig = computed<GenerationStageConfig | null>(() => {
      if (!currentSession.value) return null
      const stageKey: GenerationStageKey = activeMenu.value === 'design' ? 'design' : 'analysis'
      return currentSession.value.stageConfigs.find((item) => item.stageKey === stageKey) || null
    })

    const analysisMessages = computed(() => {
      return (
        currentSession.value?.messages.filter((item) => item.channelKey === 'analysis-planner') ||
        []
      )
    })

    const planningCopilotMessages = computed(() => {
      return (
        currentSession.value?.messages.filter((item) => item.channelKey === 'planning-copilot') ||
        []
      )
    })

    const designMessages = computed(() => {
      return (
        currentSession.value?.messages.filter((item) => item.channelKey === 'design-planner') || []
      )
    })

    const dashboardStageCards = computed(() => {
      if (!currentSession.value) {
        return []
      }
      return [
        {
          stageKey: 'analysis' as const,
          title: '需求分析',
          summary: currentSession.value.analysisDocument.summary
        },
        {
          stageKey: 'design' as const,
          title: '设计生成',
          summary: activeDesignDocument.value?.summary || '尚未生成设计稿。'
        }
      ]
    })

    async function initialize(): Promise<void> {
      isLoading.value = true
      errorMessage.value = null
      try {
        const sessionList = requireData(await OrchestflowGenerationEditorDataSource.listSessions())
        sessions.value = sessionList
        globalSettings.value = requireData(
          await OrchestflowGenerationEditorDataSource.getGlobalSettings()
        )

        if (!sessionList.length) {
          await createSession()
          return
        }

        await selectSession(sessionList[0].id)
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '初始化失败'
      } finally {
        isLoading.value = false
      }
    }

    async function refreshCurrentSession(): Promise<void> {
      if (!currentSession.value) return
      currentSession.value = requireData(
        await OrchestflowGenerationEditorDataSource.getSessionDetail(currentSession.value.id)
      )
    }

    async function selectSession(sessionId: string): Promise<void> {
      currentSession.value = requireData(
        await OrchestflowGenerationEditorDataSource.getSessionDetail(sessionId)
      )
    }

    async function createSession(): Promise<void> {
      const created = requireData(
        await OrchestflowGenerationEditorDataSource.createSession({
          title: newSessionTitle.value.trim() || '新建工作流方案'
        })
      )
      sessions.value = requireData(await OrchestflowGenerationEditorDataSource.listSessions())
      currentSession.value = created
      activeMenu.value = 'analysis'
    }

    async function deleteSession(sessionId: string): Promise<void> {
      await OrchestflowGenerationEditorDataSource.deleteSession({ sessionId })
      const sessionList = requireData(await OrchestflowGenerationEditorDataSource.listSessions())
      sessions.value = sessionList
      if (!sessionList.length) {
        currentSession.value = null as never
        await createSession()
        return
      }
      await selectSession(sessionList[0].id)
    }

    async function updateStageConfig(config: GenerationStageConfig): Promise<void> {
      if (!currentSession.value) return
      requireData(
        await OrchestflowGenerationEditorDataSource.saveStageConfig({
          sessionId: currentSession.value.id,
          config
        })
      )
      await refreshCurrentSession()
    }

    async function saveAnalysisDocument(document: GenerationAnalysisDocument): Promise<void> {
      if (!currentSession.value) return
      requireData(
        await OrchestflowGenerationEditorDataSource.saveAnalysisDocument({
          sessionId: currentSession.value.id,
          document
        })
      )
      await refreshCurrentSession()
    }

    async function ensureDesignDocument(): Promise<GenerationDesignDocument | null> {
      if (!currentSession.value) return null
      if (activeDesignDocument.value) return activeDesignDocument.value
      const created = requireData(
        await OrchestflowGenerationEditorDataSource.createDesignDocument({
          sessionId: currentSession.value.id,
          title: '设计稿'
        })
      )
      await refreshCurrentSession()
      return created
    }

    async function saveDesignDocument(document: GenerationDesignDocument): Promise<void> {
      if (!currentSession.value) return
      requireData(
        await OrchestflowGenerationEditorDataSource.saveDesignDocument({
          sessionId: currentSession.value.id,
          document
        })
      )
      await refreshCurrentSession()
    }

    async function selectDesignDocument(designDocumentId: string): Promise<void> {
      if (!currentSession.value) return
      currentSession.value = requireData(
        await OrchestflowGenerationEditorDataSource.selectDesignDocument({
          sessionId: currentSession.value.id,
          designDocumentId
        })
      )
    }

    async function createDesignDocument(title = '设计稿'): Promise<void> {
      if (!currentSession.value) return
      requireData(
        await OrchestflowGenerationEditorDataSource.createDesignDocument({
          sessionId: currentSession.value.id,
          title
        })
      )
      await refreshCurrentSession()
    }

    async function deleteDesignDocument(designDocumentId: string): Promise<void> {
      if (!currentSession.value) return
      await OrchestflowGenerationEditorDataSource.deleteDesignDocument({
        sessionId: currentSession.value.id,
        designDocumentId
      })
      await refreshCurrentSession()
    }

    async function sendMessage(channelKey: GenerationChannelKey, text: string): Promise<void> {
      if (!currentSession.value || !currentStageConfig.value) return
      const trimmed = text.trim()
      if (!trimmed) return
      const designDocumentId =
        channelKey === 'design-planner' ? activeDesignDocument.value?.id || null : null
      requireData(
        await OrchestflowGenerationEditorDataSource.sendMessage({
          sessionId: currentSession.value.id,
          channelKey,
          text: trimmed,
          providerId: currentStageConfig.value.providerId,
          modelId: currentStageConfig.value.modelId,
          designDocumentId
        })
      )
      await refreshCurrentSession()
      if (channelKey === 'analysis-planner') analysisInput.value = ''
      if (channelKey === 'planning-copilot') planningCopilotInput.value = ''
      if (channelKey === 'design-planner') designInput.value = ''
    }

    async function compileDesignDocumentToWorkflow(): Promise<string | null> {
      if (!currentSession.value || !activeDesignDocument.value) return null
      const result = requireData(
        await OrchestflowGenerationEditorDataSource.compileDesignDocumentToWorkflow({
          sessionId: currentSession.value.id,
          designDocumentId: activeDesignDocument.value.id
        })
      )
      await refreshCurrentSession()
      return result.workflowId
    }

    async function updateGlobalSettings(
      settings: Partial<GenerationGlobalSettings>
    ): Promise<void> {
      globalSettings.value = requireData(
        await OrchestflowGenerationEditorDataSource.updateGlobalSettings(settings)
      )
    }

    function bindStreamListener(): () => void {
      return OrchestflowGenerationEditorDataSource.onStream((event) => {
        inspectorStore.appendEvent(event)

        if (event.type === 'artifact-replace' && currentSession.value) {
          if (event.artifact === 'analysis-document') {
            currentSession.value.analysisDocument.content = event.content
            currentSession.value.analysisDocument.summary = event.summary
            return
          }

          const targetDocument =
            currentSession.value.designDocuments.find((item) => item.id === event.documentId) ||
            activeDesignDocument.value
          if (targetDocument) {
            targetDocument.content = event.content
            targetDocument.summary = event.summary
          }
        }
      })
    }

    return {
      inspectorStore,
      sessions,
      currentSession,
      activeMenu,
      analysisInput,
      planningCopilotInput,
      designInput,
      isLoading,
      errorMessage,
      showModelSelector,
      showConfigDrawer,
      globalSettings,
      newSessionTitle,
      activeDesignDocument,
      currentStageConfig,
      analysisMessages,
      planningCopilotMessages,
      designMessages,
      dashboardStageCards,
      initialize,
      refreshCurrentSession,
      selectSession,
      createSession,
      deleteSession,
      updateStageConfig,
      saveAnalysisDocument,
      ensureDesignDocument,
      saveDesignDocument,
      selectDesignDocument,
      createDesignDocument,
      deleteDesignDocument,
      sendMessage,
      compileDesignDocumentToWorkflow,
      updateGlobalSettings,
      bindStreamListener
    }
  }
)
