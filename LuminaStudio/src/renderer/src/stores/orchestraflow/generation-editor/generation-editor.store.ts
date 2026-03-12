import { computed, ref } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import {
  OrchestflowGenerationEditorDataSource,
  resolveMenuByStage
} from './generation-editor.datasource'
import type {
  GenerateCopilotMode,
  GenerateViewStatus,
  GenerateSessionDetailViewModel,
  GenerateSessionViewModel
} from './generation-editor.types'
import type {
  GenerationDocument,
  GenerationMessage,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'
import { useGenerationSessionListStore } from './sessions/session-list.store'
import { useGenerationSessionDetailCacheStore } from './sessions/session-detail-cache.store'
import { useGenerationWorkspaceShellStore } from './workspace/workspace-shell.store'
import { useGenerationWorkspaceCreateSessionStore } from './workspace/workspace-create-session.store'
import { useGenerationWorkspaceDashboardStore } from './workspace/workspace-dashboard.store'
import { useGenerationAnalysisDiscussionStore } from './analysis/analysis-discussion.store'
import { useGenerationAnalysisCopilotStore } from './analysis/analysis-copilot.store'
import { useGenerationAnalysisStageConfigStore } from './analysis/analysis-stage-config.store'
import { useGenerationAnalysisDocumentStore } from './analysis/analysis-document.store'
import { useGenerationDesignCopilotStore } from './design/design-copilot.store'
import { useGenerationDesignStageConfigStore } from './design/design-stage-config.store'
import { useGenerationDesignDocumentStore } from './design/design-document.store'
import { useGenerationVerifyCopilotStore } from './verify/verify-copilot.store'
import { useGenerationVerifyStageConfigStore } from './verify/verify-stage-config.store'
import { useGenerationVerifyDocumentStore } from './verify/verify-document.store'
import { useGenerationGlobalSettingsStore } from './settings/global-settings.store'

/**
 * facade 层只负责：
 * - 组合各业务域 store
 * - 对旧页面暴露兼容字段/方法
 * - 统一注册一次流式监听并把事件分发到各通道 store
 *
 * 真正状态已经下放到各域 store，不再继续把所有状态塞回一个大 store。
 */
export const useOrchestflowGenerationEditorStore = defineStore(
  'orchestflow-generation-editor',
  () => {
    const sessionListStore = useGenerationSessionListStore()
    const sessionDetailCacheStore = useGenerationSessionDetailCacheStore()
    const workspaceShellStore = useGenerationWorkspaceShellStore()
    const workspaceCreateSessionStore = useGenerationWorkspaceCreateSessionStore()
    const workspaceDashboardStore = useGenerationWorkspaceDashboardStore()
    const globalSettingsStore = useGenerationGlobalSettingsStore()

    const analysisDiscussionStore = useGenerationAnalysisDiscussionStore()
    const analysisCopilotStore = useGenerationAnalysisCopilotStore()
    const analysisStageConfigStore = useGenerationAnalysisStageConfigStore()
    const analysisDocumentStore = useGenerationAnalysisDocumentStore()

    const designCopilotStore = useGenerationDesignCopilotStore()
    const designStageConfigStore = useGenerationDesignStageConfigStore()
    const designDocumentStore = useGenerationDesignDocumentStore()

    const verifyCopilotStore = useGenerationVerifyCopilotStore()
    const verifyStageConfigStore = useGenerationVerifyStageConfigStore()
    const verifyDocumentStore = useGenerationVerifyDocumentStore()

    const { sessions, selectedSessionId } = storeToRefs(sessionListStore)
    const { activeMenu, activeRightPanel, isLeftSidebarCollapsed, isRightPanelFullscreen } =
      storeToRefs(workspaceShellStore)
    const { showConfigDrawer, showModelSelector, configDrawerTab } =
      storeToRefs(workspaceShellStore)
    const { showCreateSessionModal, newSessionName } = storeToRefs(workspaceCreateSessionStore)
    const { dashboardStageCards, plannedSessionsCount } = storeToRefs(workspaceDashboardStore)
    const {
      settings: globalSettings,
      isLoading: isGlobalSettingsLoading,
      isSaving: isGlobalSettingsSaving
    } = storeToRefs(globalSettingsStore)
    const { input: analysisInput, isStreaming: isAnalysisStreaming } =
      storeToRefs(analysisDiscussionStore)
    const { input: analysisCopilotInput, isStreaming: isAnalysisCopilotStreaming } =
      storeToRefs(analysisCopilotStore)
    const { input: designCopilotInput, isStreaming: isDesignCopilotStreaming } =
      storeToRefs(designCopilotStore)
    const { input: verifyCopilotInput, isStreaming: isVerifyCopilotStreaming } =
      storeToRefs(verifyCopilotStore)

    const resolvedSessionId = ref<string | null>(null)
    const pendingSessionId = ref<string | null>(null)
    const viewStatus = ref<GenerateViewStatus>('bootstrapping')
    const lastErrorMessage = ref<string | null>(null)

    const currentSession = computed<GenerateSessionDetailViewModel | null>(() => {
      return sessionDetailCacheStore.getSessionDetail(resolvedSessionId.value)
    })

    const currentStageKey = computed<GenerationStageKey>(() => {
      if (activeMenu.value === 'analysis') return 'analysis'
      if (activeMenu.value === 'design') return 'design'
      return 'verify'
    })

    const currentStageConfig = computed<GenerationStageConfig | null>(() => {
      const sessionId = currentSession.value?.id || null
      if (!sessionId) return null
      if (currentStageKey.value === 'analysis') return analysisStageConfigStore.getConfig(sessionId)
      if (currentStageKey.value === 'design') return designStageConfigStore.getConfig(sessionId)
      return verifyStageConfigStore.getConfig(sessionId)
    })

    const configDrawerStageConfig = computed<GenerationStageConfig | null>(() => {
      const sessionId = currentSession.value?.id || null
      if (!sessionId) return null
      if (configDrawerTab.value === 'analysis') return analysisStageConfigStore.getConfig(sessionId)
      if (configDrawerTab.value === 'design') return designStageConfigStore.getConfig(sessionId)
      return verifyStageConfigStore.getConfig(sessionId)
    })

    const currentModelLabel = computed(() => {
      const config = currentStageConfig.value
      if (!config?.modelId) return '选择模型'
      return config.providerId ? `${config.providerId} / ${config.modelId}` : config.modelId
    })

    const modelConfigLabel = computed(() => {
      const config = configDrawerStageConfig.value
      if (!config) return '未选择模型'
      return `${config.modelId || '未选择模型'} / 主记忆 ${config.memoryRounds} / copilot ${config.copilotMemoryRounds}`
    })

    const analysisMessages = computed(() => {
      return analysisDiscussionStore.getMessages(currentSession.value)
    })

    const copilotInput = computed<string>({
      get() {
        if (activeRightPanel.value === 'analysis') return analysisCopilotInput.value
        if (activeRightPanel.value === 'design') return designCopilotInput.value
        return verifyCopilotInput.value
      },
      set(value) {
        if (activeRightPanel.value === 'analysis') {
          analysisCopilotStore.input = value
          return
        }
        if (activeRightPanel.value === 'design') {
          designCopilotStore.input = value
          return
        }
        verifyCopilotStore.input = value
      }
    })

    const activeCopilotMessages = computed<GenerationMessage[]>(() => {
      if (activeRightPanel.value === 'analysis')
        return analysisCopilotStore.getMessages(currentSession.value)
      if (activeRightPanel.value === 'design')
        return designCopilotStore.getMessages(currentSession.value)
      if (activeRightPanel.value === 'verify')
        return verifyCopilotStore.getMessages(currentSession.value)
      return []
    })

    const activeCopilotDocument = computed<GenerationDocument | null>(() => {
      const sessionId = currentSession.value?.id || null
      if (!sessionId || !activeRightPanel.value) return null
      if (activeRightPanel.value === 'analysis') return analysisDocumentStore.getDocument(sessionId)
      if (activeRightPanel.value === 'design') return designDocumentStore.getDocument(sessionId)
      return verifyDocumentStore.getDocument(sessionId)
    })

    const isActiveCopilotStreaming = computed(() => {
      if (activeRightPanel.value === 'analysis') return isAnalysisCopilotStreaming.value
      if (activeRightPanel.value === 'design') return isDesignCopilotStreaming.value
      if (activeRightPanel.value === 'verify') return isVerifyCopilotStreaming.value
      return false
    })

    function buildErrorMessage(error: unknown): string {
      return error instanceof Error ? error.message : '加载 GenerateView 失败，请重试。'
    }

    function setErrorState(error: unknown): void {
      lastErrorMessage.value = buildErrorMessage(error)
      pendingSessionId.value = null
      if (!currentSession.value) {
        viewStatus.value = 'error'
      } else {
        viewStatus.value = 'ready'
      }
    }

    async function createDefaultSession(): Promise<GenerateSessionDetailViewModel> {
      const created = await sessionListStore.createSession('新建生成会话')
      hydrateSessionDetail(created)
      resolvedSessionId.value = created.id
      selectedSessionId.value = created.id
      activeMenu.value = 'analysis'
      pendingSessionId.value = null
      lastErrorMessage.value = null
      viewStatus.value = 'ready'
      return created
    }

    /**
     * 统一负责把目标 session 解析成“当前真正可渲染的页面状态”。
     * 切换过程中保留旧页面，只有成功拿到 detail 后才提交新的 resolvedSessionId。
     */
    async function resolveSession(
      sessionId: string,
      options: {
        preserveCurrentView?: boolean
        createDefaultOnFailure?: boolean
      } = {}
    ): Promise<GenerateSessionDetailViewModel | null> {
      const { preserveCurrentView = true, createDefaultOnFailure = false } = options

      pendingSessionId.value = sessionId
      lastErrorMessage.value = null
      viewStatus.value = preserveCurrentView && currentSession.value ? 'switching' : 'bootstrapping'

      try {
        const detail = await sessionDetailCacheStore.refreshSessionDetail(sessionId)
        hydrateSessionDetail(detail)
        resolvedSessionId.value = detail.id
        selectedSessionId.value = detail.id
        pendingSessionId.value = null
        viewStatus.value = 'ready'
        return detail
      } catch (error) {
        sessionDetailCacheStore.removeSessionDetail(sessionId)

        if (currentSession.value?.id && currentSession.value.id !== sessionId) {
          selectedSessionId.value = currentSession.value.id
          setErrorState(error)
          return null
        }

        resolvedSessionId.value = null

        if (createDefaultOnFailure) {
          try {
            return await createDefaultSession()
          } catch (createError) {
            setErrorState(createError)
            return null
          }
        }

        setErrorState(error)
        return null
      }
    }

    /**
     * 统一保证当前页面总能拿到一个可用会话。
     */
    async function ensureActiveSession(): Promise<GenerateSessionDetailViewModel | null> {
      if (!sessions.value.length) {
        return createDefaultSession()
      }

      const targetSessionId = selectedSessionId.value || sessions.value[0]?.id || null

      if (!targetSessionId) {
        return createDefaultSession()
      }

      return resolveSession(targetSessionId, {
        preserveCurrentView: Boolean(currentSession.value),
        createDefaultOnFailure: true
      })
    }

    async function initialize(): Promise<void> {
      await globalSettingsStore.initialize()
      await sessionListStore.initialize()
      await ensureActiveSession()
    }

    function bindStreamListener(): () => void {
      return OrchestflowGenerationEditorDataSource.onStream((event) => {
        const detail = sessionDetailCacheStore.getSessionDetail(event.sessionId)
        if (!detail) return

        const handled =
          analysisDiscussionStore.applyStreamEvent(detail, event) ||
          analysisCopilotStore.applyStreamEvent(detail, event) ||
          designCopilotStore.applyStreamEvent(detail, event) ||
          verifyCopilotStore.applyStreamEvent(detail, event)

        if (!handled) return

        if (event.type === 'error' || event.type === 'finish') {
          void refreshSessionDetail(event.sessionId)
        }
      })
    }

    async function refreshSessionDetail(sessionId: string): Promise<void> {
      try {
        const detail = await sessionDetailCacheStore.refreshSessionDetail(sessionId)
        hydrateSessionDetail(detail)
        sessionListStore.mergeSessionSummary(detail)
        if (resolvedSessionId.value === sessionId) {
          lastErrorMessage.value = null
          viewStatus.value = 'ready'
        }
      } catch {
        // 当前展示中的 session 明细丢失时，立即走恢复链路，不再把整页卡在 loading。
        if (resolvedSessionId.value === sessionId) {
          resolvedSessionId.value = null
          await ensureActiveSession()
        }
      }
    }

    function hydrateSessionDetail(detail: GenerateSessionDetailViewModel): void {
      // 这里必须先把 detail 写回缓存，因为 GenerateView 的 currentSession 就是从 detail cache 读取的。
      sessionDetailCacheStore.setSessionDetail(detail)

      analysisStageConfigStore.setConfig(detail.id, detail.stageConfigs.analysis)
      designStageConfigStore.setConfig(detail.id, detail.stageConfigs.design)
      verifyStageConfigStore.setConfig(detail.id, detail.stageConfigs.verify)

      analysisDocumentStore.setDocument(detail.id, detail.documents.analysis)
      designDocumentStore.setDocument(detail.id, detail.documents.design)
      verifyDocumentStore.setDocument(detail.id, detail.documents.verify)

      sessionListStore.mergeSessionSummary(detail)
    }

    async function selectSession(sessionId: string): Promise<void> {
      const nextSummary = sessions.value.find((item) => item.id === sessionId)
      selectedSessionId.value = sessionId
      activeMenu.value = resolveMenuByStage(nextSummary?.currentStage || 'analysis')

      if (resolvedSessionId.value === sessionId && currentSession.value) {
        pendingSessionId.value = null
        viewStatus.value = 'ready'
        return
      }

      await resolveSession(sessionId, {
        preserveCurrentView: Boolean(currentSession.value),
        createDefaultOnFailure: !currentSession.value
      })
    }

    async function createSession(): Promise<void> {
      const title = newSessionName.value.trim()
      if (!title) return
      const detail = await sessionListStore.createSession(title)
      hydrateSessionDetail(detail)
      showCreateSessionModal.value = false
      newSessionName.value = ''
      activeMenu.value = 'analysis'
    }

    async function deleteSession(sessionId: string): Promise<void> {
      const wasCurrentSession = selectedSessionId.value === sessionId

      await sessionListStore.deleteSession(sessionId)
      sessionDetailCacheStore.removeSessionDetail(sessionId)

      if (wasCurrentSession) {
        activeRightPanel.value = null
      }

      if (resolvedSessionId.value === sessionId) {
        resolvedSessionId.value = null
      }

      if (selectedSessionId.value) {
        const nextSummary = sessions.value.find((item) => item.id === selectedSessionId.value)
        activeMenu.value = resolveMenuByStage(nextSummary?.currentStage || 'analysis')
        await resolveSession(selectedSessionId.value, {
          preserveCurrentView: false,
          createDefaultOnFailure: true
        })
        return
      }

      await ensureActiveSession()
    }

    async function retryInitialize(): Promise<void> {
      viewStatus.value = 'bootstrapping'
      lastErrorMessage.value = null
      await initialize()
    }

    async function updateGlobalSettings(
      partial: Partial<typeof globalSettings.value>
    ): Promise<void> {
      await globalSettingsStore.updateSettings(partial)
    }

    async function saveCurrentStageConfig(partial: Partial<GenerationStageConfig>): Promise<void> {
      if (!currentSession.value || !currentStageConfig.value) return
      const nextConfig: GenerationStageConfig = {
        ...currentStageConfig.value,
        ...partial
      }
      await OrchestflowGenerationEditorDataSource.saveStageConfig({
        sessionId: currentSession.value.id,
        config: nextConfig
      })
      currentSession.value.stageConfigs[nextConfig.stageKey] = nextConfig
      if (nextConfig.stageKey === 'analysis')
        analysisStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      if (nextConfig.stageKey === 'design')
        designStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      if (nextConfig.stageKey === 'verify')
        verifyStageConfigStore.setConfig(currentSession.value.id, nextConfig)
    }

    async function saveConfigDrawerStageConfig(
      partial: Partial<GenerationStageConfig>
    ): Promise<void> {
      if (!currentSession.value || !configDrawerStageConfig.value) return
      const nextConfig: GenerationStageConfig = {
        ...configDrawerStageConfig.value,
        ...partial
      }
      await OrchestflowGenerationEditorDataSource.saveStageConfig({
        sessionId: currentSession.value.id,
        config: nextConfig
      })
      currentSession.value.stageConfigs[nextConfig.stageKey] = nextConfig
      if (nextConfig.stageKey === 'analysis')
        analysisStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      if (nextConfig.stageKey === 'design')
        designStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      if (nextConfig.stageKey === 'verify')
        verifyStageConfigStore.setConfig(currentSession.value.id, nextConfig)
    }

    async function saveDocument(document: GenerationDocument): Promise<void> {
      if (!currentSession.value) return
      await OrchestflowGenerationEditorDataSource.saveDocument({
        sessionId: currentSession.value.id,
        document
      })
      currentSession.value.documents[document.documentKey] = document
      if (document.documentKey === 'analysis')
        analysisDocumentStore.setDocument(currentSession.value.id, document)
      if (document.documentKey === 'design')
        designDocumentStore.setDocument(currentSession.value.id, document)
      if (document.documentKey === 'verify')
        verifyDocumentStore.setDocument(currentSession.value.id, document)
    }

    async function updateSessionState(payload: {
      currentStage?: GenerateSessionViewModel['currentStage']
      summary?: string
      analysisTurnCount?: number
      planGenerated?: boolean
    }): Promise<void> {
      if (!currentSession.value) return
      const updated = await OrchestflowGenerationEditorDataSource.updateSessionState({
        sessionId: currentSession.value.id,
        currentStage: payload.currentStage,
        summary: payload.summary,
        analysisTurnCount: payload.analysisTurnCount,
        planGenerated: payload.planGenerated
      })
      sessionListStore.mergeSessionSummary(updated)
      const existing = sessionDetailCacheStore.getSessionDetail(currentSession.value.id)
      if (existing) {
        existing.currentStage = updated.currentStage
        existing.summary = updated.summary
        existing.analysisTurnCount = updated.analysisTurnCount
        existing.planGenerated = updated.planGenerated
      }
    }

    async function sendAnalysisMessage(): Promise<void> {
      if (!currentSession.value) return
      await analysisDiscussionStore.sendMessage(currentSession.value, currentStageConfig.value)
    }

    async function sendCopilotMessage(): Promise<void> {
      if (!currentSession.value || !activeRightPanel.value) return
      if (activeRightPanel.value === 'analysis') {
        await analysisCopilotStore.sendMessage(
          currentSession.value,
          analysisStageConfigStore.getConfig(currentSession.value.id)
        )
        return
      }
      if (activeRightPanel.value === 'design') {
        await designCopilotStore.sendMessage(
          currentSession.value,
          designStageConfigStore.getConfig(currentSession.value.id)
        )
        return
      }
      await verifyCopilotStore.sendMessage(
        currentSession.value,
        verifyStageConfigStore.getConfig(currentSession.value.id)
      )
    }

    async function toggleAutoApproved(): Promise<void> {
      if (!currentSession.value || !activeRightPanel.value) return
      const stageKey = activeRightPanel.value
      const source =
        stageKey === 'analysis'
          ? analysisStageConfigStore.getConfig(currentSession.value.id)
          : stageKey === 'design'
            ? designStageConfigStore.getConfig(currentSession.value.id)
            : verifyStageConfigStore.getConfig(currentSession.value.id)

      if (!source) return
      await saveConfigDrawerStageConfig({
        stageKey,
        autoApproved: !source.autoApproved
      })
    }

    function openCopilotPanel(mode: GenerateCopilotMode): void {
      activeRightPanel.value = mode
    }

    function closeRightPanel(): void {
      activeRightPanel.value = null
      isRightPanelFullscreen.value = false
    }

    async function enterDesignView(): Promise<void> {
      activeMenu.value = 'design'
      await updateSessionState({
        currentStage: 'design',
        summary: '已进入规划设计阶段。'
      })
      openCopilotPanel('design')
    }

    async function handleDesignContentUpdate(value: string): Promise<void> {
      if (!currentSession.value) return
      const currentDocument = designDocumentStore.getDocument(currentSession.value.id)
      if (!currentDocument) return
      const nextDocument = {
        ...currentDocument,
        content: value,
        summary: '设计正文已保存到数据库。'
      }
      await saveDocument(nextDocument)
      await updateSessionState({ summary: nextDocument.summary })
    }

    async function handleStageModelSelect(payload: {
      provider: { id: string }
      model: { id: string }
    }) {
      await saveCurrentStageConfig({
        providerId: payload.provider.id,
        modelId: payload.model.id
      })
    }

    function getStageLabel(stage: GenerateSessionViewModel['currentStage']): string {
      if (stage === 'analysis') return '未完成需求分析'
      if (stage === 'design') return '未完成设计'
      if (stage === 'verify') return '未完成校验'
      return '未生成工作流'
    }

    function getSessionStageDotClass(currentStage: string, stage: string): string {
      if (currentStage === stage) {
        if (stage === 'analysis') return 'rounded-full h-3.5 w-3.5 bg-cyan-500'
        if (stage === 'design') return 'rounded-full h-3.5 w-3.5 bg-emerald-500'
        if (stage === 'verify') return 'rounded-full h-3.5 w-3.5 bg-violet-500'
        return 'rounded-full h-3.5 w-3.5 bg-amber-500'
      }
      if (stage === 'analysis') return 'rounded-full h-2 w-2 bg-cyan-200'
      if (stage === 'design') return 'rounded-full h-2 w-2 bg-emerald-200'
      if (stage === 'verify') return 'rounded-full h-2 w-2 bg-violet-200'
      return 'rounded-full h-2 w-2 bg-amber-200'
    }

    return {
      sessions,
      selectedSessionId,
      resolvedSessionId,
      pendingSessionId,
      viewStatus,
      lastErrorMessage,
      activeMenu,
      activeRightPanel,
      isLeftSidebarCollapsed,
      isRightPanelFullscreen,
      isAnalysisStreaming,
      isActiveCopilotStreaming,
      showCreateSessionModal,
      showConfigDrawer,
      showModelSelector,
      newSessionName,
      analysisInput,
      copilotInput,
      configDrawerTab,
      currentSession,
      currentStageConfig,
      currentModelLabel,
      modelConfigLabel,
      analysisMessages,
      activeCopilotMessages,
      activeCopilotDocument,
      dashboardStageCards,
      plannedSessionsCount,
      globalSettings,
      isGlobalSettingsLoading,
      isGlobalSettingsSaving,
      initialize,
      retryInitialize,
      updateGlobalSettings,
      bindStreamListener,
      selectSession,
      createSession,
      deleteSession,
      saveCurrentStageConfig,
      saveConfigDrawerStageConfig,
      saveDocument,
      updateSessionState,
      sendAnalysisMessage,
      sendCopilotMessage,
      toggleAutoApproved,
      openCopilotPanel,
      closeRightPanel,
      enterDesignView,
      handleDesignContentUpdate,
      handleStageModelSelect,
      getStageLabel,
      getSessionStageDotClass
    }
  }
)
