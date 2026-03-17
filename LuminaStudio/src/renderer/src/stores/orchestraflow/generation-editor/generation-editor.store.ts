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
    // 这些状态只负责当前页面壳层，不额外引入新的业务状态源。
    const activeMenu = ref<'dashboard' | 'sessions' | 'analysis' | 'design' | 'settings'>(
      'dashboard'
    )
    const activeRightPanel = ref<'analysis' | 'design' | null>(null)
    const isLeftSidebarCollapsed = ref(false)
    const isRightPanelFullscreen = ref(false)
    const analysisInput = ref('')
    const planningCopilotInput = ref('')
    const designInput = ref('')
    const isLoading = ref(false)
    const errorMessage = ref<string | null>(null)
    const showModelSelector = ref(false)
    const showConfigDrawer = ref(false)
    const showCreateSessionModal = ref(false)
    const showDesignManagerModal = ref(false)
    const globalSettings = ref<GenerationGlobalSettings>({
      persistRawLlmData: false
    })
    const newSessionTitle = ref('新建工作流方案')
    const designDocumentViewMode = ref<'preview' | 'dsl' | 'diagnostics'>('preview')
    const selectedDesignDiagnosticIndex = ref<number | null>(null)

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

    const isAnalysisStreaming = computed(() => {
      return analysisMessages.value.some((item) => item.status === 'streaming')
    })

    const isPlanningCopilotStreaming = computed(() => {
      return planningCopilotMessages.value.some((item) => item.status === 'streaming')
    })

    const isDesignStreaming = computed(() => {
      return designMessages.value.some((item) => item.status === 'streaming')
    })

    const currentModelLabel = computed(() => {
      const config = currentStageConfig.value
      if (!config?.modelId) return '选择模型'
      return config.providerId ? `${config.providerId} / ${config.modelId}` : config.modelId
    })

    const currentSessionStageLabel = computed(() => {
      return currentSession.value ? getStageLabel(currentSession.value.currentStage) : '未进入流程'
    })

    const copilotInput = computed<string>({
      get() {
        return activeRightPanel.value === 'design' ? designInput.value : planningCopilotInput.value
      },
      set(value) {
        if (activeRightPanel.value === 'design') {
          designInput.value = value
          return
        }
        planningCopilotInput.value = value
      }
    })

    const activeCopilotMessages = computed(() => {
      return activeRightPanel.value === 'design'
        ? designMessages.value
        : planningCopilotMessages.value
    })

    const isActiveCopilotStreaming = computed(() => {
      return activeRightPanel.value === 'design'
        ? isDesignStreaming.value
        : isPlanningCopilotStreaming.value
    })

    const plannedSessionsCount = computed(() => {
      return sessions.value.filter((item) => item.designVersionCount > 0).length
    })

    const dashboardStageCards = computed(() => {
      return [
        {
          stageKey: 'analysis' as const,
          title: '需求分析',
          count: sessions.value.filter((item) => item.currentStage === 'analysis').length,
          color: 'bg-cyan-500'
        },
        {
          stageKey: 'design' as const,
          title: '设计生成',
          count: sessions.value.filter((item) => item.currentStage === 'design').length,
          color: 'bg-emerald-500'
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
      // 从会话管理进入后，直接跳到该会话当前对应的主面板，减少一次额外点击。
      activeMenu.value = currentSession.value.currentStage === 'design' ? 'design' : 'analysis'
      showDesignManagerModal.value = false
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
      showCreateSessionModal.value = false
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
      designDocumentViewMode.value = 'dsl'
      selectedDesignDiagnosticIndex.value = null
    }

    async function selectDesignDocument(designDocumentId: string): Promise<void> {
      if (!currentSession.value) return
      currentSession.value = requireData(
        await OrchestflowGenerationEditorDataSource.selectDesignDocument({
          sessionId: currentSession.value.id,
          designDocumentId
        })
      )
      designDocumentViewMode.value = 'preview'
      selectedDesignDiagnosticIndex.value = null
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
      designDocumentViewMode.value = 'preview'
      selectedDesignDiagnosticIndex.value = null
    }

    async function deleteDesignDocument(designDocumentId: string): Promise<void> {
      if (!currentSession.value) return
      await OrchestflowGenerationEditorDataSource.deleteDesignDocument({
        sessionId: currentSession.value.id,
        designDocumentId
      })
      await refreshCurrentSession()
      selectedDesignDiagnosticIndex.value = null
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
        // text-delta 高频事件不写入 inspector，避免详情面板事件列表爆炸
        if (event.type !== 'text-delta') {
          inspectorStore.appendEvent(event)
        }

        if (!currentSession.value) return

        // 流式增量：直接拼到对应的 assistant message 上
        if (event.type === 'text-delta') {
          const targetMessage = currentSession.value.messages.find((item) => item.id === event.messageId)
          if (targetMessage) {
            targetMessage.content = `${targetMessage.content || ''}${event.delta}`
            targetMessage.status = 'streaming'
          }
          return
        }

        // 结束：刷新一次会话，拿到最终 content/status（以及后端落库后的任何修正）
        if (event.type === 'run-finish') {
          const belongsToCurrentSession = currentSession.value.messages.some(
            (item) => item.id === event.messageId
          )
          if (belongsToCurrentSession) {
            void refreshCurrentSession()
          }
          return
        }

        // 错误：不要刷新（刷新会把流式内容覆盖成后端 error 文本），直接标记失败并附加错误信息
        if (event.type === 'run-error') {
          const targetMessage = currentSession.value.messages.find((item) => item.id === event.messageId)
          if (targetMessage) {
            targetMessage.status = 'failed'
            if (!targetMessage.content?.trim()) {
              targetMessage.content = event.error
            } else {
              targetMessage.content = `${targetMessage.content}\n\n[Error] ${event.error}`
            }
          }
          return
        }

        if (event.type === 'artifact-replace') {
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

    async function sendAnalysisMessage(): Promise<void> {
      await sendMessage('analysis-planner', analysisInput.value)
    }

    async function sendCopilotMessage(): Promise<void> {
      if (activeRightPanel.value === 'design') {
        await sendMessage('design-planner', designInput.value)
        return
      }
      await sendMessage('planning-copilot', planningCopilotInput.value)
    }

    function openCopilotPanel(mode: 'analysis' | 'design'): void {
      activeRightPanel.value = mode
    }

    function closeRightPanel(): void {
      activeRightPanel.value = null
      isRightPanelFullscreen.value = false
    }

    function openDesignManager(): void {
      showDesignManagerModal.value = true
    }

    function closeDesignManager(): void {
      showDesignManagerModal.value = false
    }

    async function handleStageModelSelect(payload: {
      provider: { id: string }
      model: { id: string }
    }): Promise<void> {
      if (!currentStageConfig.value) return
      await updateStageConfig({
        ...currentStageConfig.value,
        providerId: payload.provider.id,
        modelId: payload.model.id
      })
    }

    function getStageLabel(stage: GenerationStageKey): string {
      if (stage === 'analysis') return '需求分析中'
      if (stage === 'design') return '设计生成中'
      return '进行中'
    }

    function getSessionStageDotClass(currentStage: string, stage: string): string {
      if (currentStage === stage) {
        if (stage === 'analysis') return 'h-3 w-3 rounded-full bg-cyan-500'
        if (stage === 'design') return 'h-3 w-3 rounded-full bg-emerald-500'
      }
      if (stage === 'analysis') return 'h-2 w-2 rounded-full bg-cyan-200'
      if (stage === 'design') return 'h-2 w-2 rounded-full bg-emerald-200'
      return 'h-2 w-2 rounded-full bg-slate-200'
    }

    return {
      inspectorStore,
      sessions,
      currentSession,
      activeMenu,
      activeRightPanel,
      isLeftSidebarCollapsed,
      isRightPanelFullscreen,
      analysisInput,
      planningCopilotInput,
      designInput,
      copilotInput,
      isAnalysisStreaming,
      isPlanningCopilotStreaming,
      isDesignStreaming,
      isActiveCopilotStreaming,
      isLoading,
      errorMessage,
      showModelSelector,
      showConfigDrawer,
      showCreateSessionModal,
      showDesignManagerModal,
      globalSettings,
      newSessionTitle,
      newSessionName: newSessionTitle,
      designDocumentViewMode,
      selectedDesignDiagnosticIndex,
      activeDesignDocument,
      currentStageConfig,
      currentModelLabel,
      currentSessionStageLabel,
      analysisMessages,
      planningCopilotMessages,
      designMessages,
      activeCopilotMessages,
      dashboardStageCards,
      plannedSessionsCount,
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
      sendAnalysisMessage,
      sendCopilotMessage,
      compileDesignDocumentToWorkflow,
      updateGlobalSettings,
      bindStreamListener,
      openCopilotPanel,
      closeRightPanel,
      openDesignManager,
      closeDesignManager,
      handleStageModelSelect,
      getStageLabel,
      getSessionStageDotClass
    }
  }
)
