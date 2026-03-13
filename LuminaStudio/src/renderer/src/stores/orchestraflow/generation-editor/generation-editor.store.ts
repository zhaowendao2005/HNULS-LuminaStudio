import { computed, ref } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import type { OFPlanningSectionKey } from '@shared/Orchestraflow-types'
import {
  OrchestflowGenerationEditorDataSource,
  resolveMenuByStage
} from './generation-editor.datasource'
import {
  parseDesignDiagnosticsJson,
  type GenerateAnalysisPlanningViewMode,
  type GenerateCopilotMode,
  type GenerateDesignDocumentViewMode,
  type GenerateSessionDetailViewModel,
  type GenerateSessionViewModel,
  type GenerateViewStatus
} from './generation-editor.types'
import type {
  GenerationDesignDocument,
  GenerationDocument,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningDocument,
  GenerationStageConfig,
  GenerationStageKey,
  GenerationStreamEvent
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
 * - 对页面暴露兼容字段/方法
 * - 统一注册流式监听并分发到各通道 store
 * - 维护 planning / design 当前选中项的页面级 SSOT
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
    const analysisPlanningViewMode = ref<GenerateAnalysisPlanningViewMode>('preview')
    const designDocumentViewMode = ref<GenerateDesignDocumentViewMode>('snapshot')
    const selectedDesignDiagnosticIndex = ref<number | null>(null)
    const isPlanningDocumentSaving = ref(false)
    const showDesignManagerModal = ref(false)
    const designManagerPlanningDocumentId = ref<string | null>(null)

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

    const analysisActivePlanningDocument = computed<GenerationPlanningDocument | null>(() => {
      const documentId =
        currentSession.value?.stageConfigs.analysis.activePlanningDocumentId || null
      if (!documentId || !currentSession.value) {
        return null
      }
      return currentSession.value.planningDocuments[documentId] ?? null
    })

    const designDocumentList = computed<GenerationDesignDocument[]>(() => {
      if (!currentSession.value) {
        return []
      }

      return Object.values(currentSession.value.designDocuments).sort((left, right) => {
        if (left.planningDocumentId !== right.planningDocumentId) {
          return left.updatedAt < right.updatedAt ? 1 : -1
        }
        if (left.version !== right.version) {
          return right.version - left.version
        }
        return left.updatedAt < right.updatedAt ? 1 : -1
      })
    })

    const filteredDesignDocumentList = computed<GenerationDesignDocument[]>(() => {
      if (!designManagerPlanningDocumentId.value) {
        return designDocumentList.value
      }
      return designDocumentList.value.filter(
        (document) => document.planningDocumentId === designManagerPlanningDocumentId.value
      )
    })

    const activeDesignDocument = computed<GenerationDesignDocument | null>(() => {
      const documentId = currentSession.value?.stageConfigs.design.activeDesignDocumentId || null
      if (!documentId || !currentSession.value) {
        return null
      }
      return currentSession.value.designDocuments[documentId] ?? null
    })

    const activeDesignPlanningDocument = computed<GenerationPlanningDocument | null>(() => {
      const planningDocumentId = activeDesignDocument.value?.planningDocumentId || null
      if (!planningDocumentId || !currentSession.value) {
        return null
      }
      return currentSession.value.planningDocuments[planningDocumentId] ?? null
    })

    const activeDesignDiagnostics = computed(() => {
      return parseDesignDiagnosticsJson(activeDesignDocument.value?.diagnosticsJson || null)
    })

    const selectedDesignDiagnostic = computed(() => {
      if (selectedDesignDiagnosticIndex.value === null) {
        return null
      }
      return activeDesignDiagnostics.value[selectedDesignDiagnosticIndex.value] || null
    })

    const activeDesignPreviewDocument = computed<GenerationDocument | null>(() => {
      if (!activeDesignDocument.value) {
        return null
      }
      return {
        documentKey: 'design',
        title: activeDesignDocument.value.title,
        fileName: `planning_design_v${activeDesignDocument.value.version}.dsl`,
        summary: activeDesignDocument.value.summary,
        content: activeDesignDocument.value.content
      }
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
      if (activeRightPanel.value === 'analysis') {
        return analysisCopilotStore.getMessages(currentSession.value)
      }
      if (activeRightPanel.value === 'design') {
        return designCopilotStore.getMessages(
          currentSession.value,
          activeDesignDocument.value?.id || null
        )
      }
      if (activeRightPanel.value === 'verify') {
        return verifyCopilotStore.getMessages(currentSession.value)
      }
      return []
    })

    const activeCopilotDocument = computed<GenerationDocument | null>(() => {
      const sessionId = currentSession.value?.id || null
      if (!sessionId || !activeRightPanel.value) return null
      if (activeRightPanel.value === 'analysis') return analysisDocumentStore.getDocument(sessionId)
      if (activeRightPanel.value === 'design') return activeDesignPreviewDocument.value
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

        if (event.channelKey === 'design-copilot') {
          applyDesignStreamPreview(detail, event)
        }

        if (event.type === 'error' || event.type === 'finish') {
          void refreshSessionDetail(event.sessionId)
        }
      })
    }

    function applyDesignStreamPreview(
      detail: GenerateSessionDetailViewModel,
      event: GenerationStreamEvent
    ): void {
      const targetMessage = detail.messagesByChannel['design-copilot'].find((message) => {
        return (
          message.id === event.messageId ||
          (message.requestId === event.requestId && message.role === 'assistant')
        )
      })
      const designDocumentId = targetMessage?.designDocumentId
      if (!designDocumentId || !detail.designDocuments[designDocumentId]) {
        return
      }

      const targetDocument = detail.designDocuments[designDocumentId]
      targetDocument.latestGenerationMessageId = event.messageId

      if (event.type === 'stream-start') {
        targetDocument.status = 'streaming'
        if (detail.stageConfigs.design.activeDesignDocumentId === designDocumentId) {
          detail.documents.design = {
            ...detail.documents.design,
            content: targetDocument.content,
            summary: '规划设计稿 DSL 正在生成中。'
          }
          designDocumentStore.setDocument(detail.id, detail.documents.design)
        }
        return
      }

      if (event.type === 'text-delta') {
        targetDocument.status = 'streaming'
        targetDocument.content = targetMessage?.content || targetDocument.content

        if (detail.stageConfigs.design.activeDesignDocumentId === designDocumentId) {
          detail.documents.design = {
            ...detail.documents.design,
            content: targetDocument.content,
            summary: '规划设计稿 DSL 正在生成中。'
          }
          designDocumentStore.setDocument(detail.id, detail.documents.design)
        }
        return
      }

      if (event.type === 'error') {
        targetDocument.status = 'error'
      }
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
        if (resolvedSessionId.value === sessionId) {
          resolvedSessionId.value = null
          await ensureActiveSession()
        }
      }
    }

    function hydrateSessionDetail(detail: GenerateSessionDetailViewModel): void {
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
        showDesignManagerModal.value = false
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
      if (nextConfig.stageKey === 'analysis') {
        analysisStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      }
      if (nextConfig.stageKey === 'design') {
        designStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      }
      if (nextConfig.stageKey === 'verify') {
        verifyStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      }
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
      if (nextConfig.stageKey === 'analysis') {
        analysisStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      }
      if (nextConfig.stageKey === 'design') {
        designStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      }
      if (nextConfig.stageKey === 'verify') {
        verifyStageConfigStore.setConfig(currentSession.value.id, nextConfig)
      }
    }

    async function saveDocument(document: GenerationDocument): Promise<void> {
      if (!currentSession.value) return
      await OrchestflowGenerationEditorDataSource.saveDocument({
        sessionId: currentSession.value.id,
        document
      })
      currentSession.value.documents[document.documentKey] = document
      if (document.documentKey === 'analysis') {
        analysisDocumentStore.setDocument(currentSession.value.id, document)
      }
      if (document.documentKey === 'design') {
        designDocumentStore.setDocument(currentSession.value.id, document)
      }
      if (document.documentKey === 'verify') {
        verifyDocumentStore.setDocument(currentSession.value.id, document)
      }
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
        if (!activeDesignDocument.value) return
        await designCopilotStore.sendMessage(
          currentSession.value,
          designStageConfigStore.getConfig(currentSession.value.id),
          {
            designDocumentId: activeDesignDocument.value.id
          }
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

    async function ensurePlanningDocumentFromMessage(
      messageId: string
    ): Promise<GenerationPlanningDocument> {
      if (!currentSession.value) {
        throw new Error('当前没有可用会话。')
      }

      const existing = Object.values(currentSession.value.planningDocuments).find(
        (document) => document.sourceMessageId === messageId
      )
      if (existing) {
        await selectAnalysisPlanningDocument(existing.id)
        return existing
      }

      const planningDocument =
        await OrchestflowGenerationEditorDataSource.getOrCreatePlanningDocumentFromMessage({
          sessionId: currentSession.value.id,
          messageId
        })
      currentSession.value.planningDocuments[planningDocument.id] = planningDocument
      currentSession.value.stageConfigs.analysis.activePlanningDocumentId = planningDocument.id
      analysisStageConfigStore.setConfig(currentSession.value.id, {
        ...currentSession.value.stageConfigs.analysis,
        activePlanningDocumentId: planningDocument.id
      })
      return planningDocument
    }

    async function openPlanningCopilotFromMessage(messageId: string): Promise<void> {
      if (!currentSession.value) return
      await ensurePlanningDocumentFromMessage(messageId)
      analysisPlanningViewMode.value = 'preview'
      activeRightPanel.value = 'analysis'
      await refreshSessionDetail(currentSession.value.id)
    }

    async function selectAnalysisPlanningDocument(documentId: string): Promise<void> {
      if (!currentSession.value) return
      const updated = await OrchestflowGenerationEditorDataSource.selectPlanningDocument({
        sessionId: currentSession.value.id,
        stageKey: 'analysis',
        documentId
      })
      currentSession.value.stageConfigs.analysis = updated
      analysisStageConfigStore.setConfig(currentSession.value.id, updated)
    }

    async function saveActivePlanningDocumentContent(content: string): Promise<void> {
      if (!currentSession.value || !analysisActivePlanningDocument.value) return
      isPlanningDocumentSaving.value = true
      try {
        const saved = await OrchestflowGenerationEditorDataSource.savePlanningDocument({
          sessionId: currentSession.value.id,
          document: {
            ...analysisActivePlanningDocument.value,
            content
          }
        })
        currentSession.value.planningDocuments[saved.id] = saved
      } finally {
        isPlanningDocumentSaving.value = false
      }
    }

    async function applyPlanningCommandProposal(payload: {
      messageId: string
      sectionKeys?: OFPlanningSectionKey[]
    }): Promise<void> {
      if (!currentSession.value) return
      const saved = await OrchestflowGenerationEditorDataSource.applyPlanningCommandProposal({
        sessionId: currentSession.value.id,
        messageId: payload.messageId,
        sectionKeys: payload.sectionKeys
      })
      currentSession.value.planningDocuments[saved.id] = saved
      await refreshSessionDetail(currentSession.value.id)
    }

    async function rejectPlanningCommandProposal(payload: {
      messageId: string
      sectionKeys?: OFPlanningSectionKey[]
    }): Promise<void> {
      if (!currentSession.value) return
      await OrchestflowGenerationEditorDataSource.rejectPlanningCommandProposal({
        sessionId: currentSession.value.id,
        messageId: payload.messageId,
        sectionKeys: payload.sectionKeys
      })
      await refreshSessionDetail(currentSession.value.id)
    }

    async function enterDesignView(): Promise<void> {
      activeMenu.value = 'design'
      await updateSessionState({
        currentStage: 'design',
        summary: '已进入规划设计阶段。'
      })
    }

    async function requestDesignBlueprintGeneration(): Promise<void> {
      if (!currentSession.value || !activeDesignDocument.value) return

      const shouldConfirmOverwrite =
        Boolean(activeDesignDocument.value.content.trim()) &&
        !window.confirm('再次生成会覆盖当前版本正文，是否继续？')

      if (shouldConfirmOverwrite) {
        return
      }

      await enterDesignView()
      designDocumentViewMode.value = 'dsl'
      selectedDesignDiagnosticIndex.value = null
      openCopilotPanel('design')
      const config = designStageConfigStore.getConfig(currentSession.value.id)
      if (!config?.providerId || !config.modelId) {
        throw new Error('请先选择 design 阶段模型。')
      }

      const generationMode = activeDesignDocument.value.content.trim() ? 'regenerate' : 'generate'
      const initialMeta: GenerationMessageMetaPayload = {
        designBlueprintBlock: {
          kind: 'design-blueprint-generation',
          designDocumentId: activeDesignDocument.value.id,
          generationMode,
          status: 'streaming',
          progressPercent: 5,
          phaseLabel: '正在准备规划设计稿生成',
          canAbort: true,
          diagnostics: [],
          errorMessage: null
        }
      }

      await designCopilotStore.sendMessage(
        currentSession.value,
        config,
        {
          designDocumentId: activeDesignDocument.value.id,
          content:
            generationMode === 'regenerate'
              ? '重新规划设计当前版本并覆盖正文。'
              : '开始规划设计当前版本。',
          assistantMetaJson: JSON.stringify(initialMeta)
        }
      )
    }

    async function createDesignDocumentFromPlanningDocumentId(
      planningDocumentId: string
    ): Promise<void> {
      if (!currentSession.value) return
      await enterDesignView()
      const created = await OrchestflowGenerationEditorDataSource.createDesignDocumentFromPlanning({
        sessionId: currentSession.value.id,
        planningDocumentId
      })
      currentSession.value.designDocuments[created.id] = created
      currentSession.value.stageConfigs.design.activeDesignDocumentId = created.id
      designStageConfigStore.setConfig(currentSession.value.id, {
        ...currentSession.value.stageConfigs.design,
        activeDesignDocumentId: created.id
      })
      designManagerPlanningDocumentId.value = planningDocumentId
      showDesignManagerModal.value = false
      designDocumentViewMode.value = created.content.trim() ? 'dsl' : 'snapshot'
      selectedDesignDiagnosticIndex.value = null
      await refreshSessionDetail(currentSession.value.id)
    }

    async function createDesignDocumentFromPlanningMessage(messageId: string): Promise<void> {
      if (!currentSession.value) return
      const planningDocument = await ensurePlanningDocumentFromMessage(messageId)
      await createDesignDocumentFromPlanningDocumentId(planningDocument.id)
    }

    async function openExistingDesignsFromPlanningMessage(messageId: string): Promise<void> {
      if (!currentSession.value) return
      const planningDocument = await ensurePlanningDocumentFromMessage(messageId)
      await enterDesignView()
      const relatedDocuments = designDocumentList.value.filter(
        (document) => document.planningDocumentId === planningDocument.id
      )

      if (relatedDocuments.length === 1) {
        await selectDesignDocument(relatedDocuments[0].id)
        return
      }

      designManagerPlanningDocumentId.value = planningDocument.id
      showDesignManagerModal.value = true
    }

    function openDesignManager(planningDocumentId?: string | null): void {
      designManagerPlanningDocumentId.value = planningDocumentId || null
      showDesignManagerModal.value = true
      activeMenu.value = 'design'
    }

    function closeDesignManager(): void {
      showDesignManagerModal.value = false
      designManagerPlanningDocumentId.value = null
    }

    async function selectDesignDocument(designDocumentId: string): Promise<void> {
      if (!currentSession.value) return
      const updated = await OrchestflowGenerationEditorDataSource.selectDesignDocument({
        sessionId: currentSession.value.id,
        designDocumentId
      })
      currentSession.value.stageConfigs.design = updated
      designStageConfigStore.setConfig(currentSession.value.id, updated)
      await refreshSessionDetail(currentSession.value.id)
      designDocumentViewMode.value = currentSession.value.designDocuments[designDocumentId]?.content.trim()
        ? 'dsl'
        : 'snapshot'
      selectedDesignDiagnosticIndex.value = null
      closeDesignManager()
    }

    async function deleteDesignDocument(designDocumentId: string): Promise<void> {
      if (!currentSession.value) return
      await OrchestflowGenerationEditorDataSource.deleteDesignDocument({
        sessionId: currentSession.value.id,
        designDocumentId
      })
      await refreshSessionDetail(currentSession.value.id)
    }

    async function handleDesignContentUpdate(value: string): Promise<void> {
      if (!currentSession.value || !activeDesignDocument.value) return
      designDocumentViewMode.value = 'dsl'
      selectedDesignDiagnosticIndex.value = null
      const saved = await OrchestflowGenerationEditorDataSource.saveDesignDocument({
        sessionId: currentSession.value.id,
        document: {
          ...activeDesignDocument.value,
          content: value
        }
      })
      currentSession.value.designDocuments[saved.id] = saved
      currentSession.value.documents.design = {
        ...currentSession.value.documents.design,
        summary: saved.summary,
        content: saved.content
      }
      designDocumentStore.setDocument(
        currentSession.value.id,
        currentSession.value.documents.design
      )
      await updateSessionState({ summary: saved.summary })
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

    function getDesignDocumentCountByPlanningDocumentId(planningDocumentId: string | null): number {
      if (!planningDocumentId) {
        return 0
      }
      return designDocumentList.value.filter(
        (document) => document.planningDocumentId === planningDocumentId
      ).length
    }

    function openDesignDiagnostics(index: number | null = null): void {
      if (!activeDesignDocument.value) return
      designDocumentViewMode.value = 'diagnostics'
      selectedDesignDiagnosticIndex.value =
        index === null ? (activeDesignDiagnostics.value.length ? 0 : null) : index
    }

    function clearDesignDiagnosticSelection(): void {
      selectedDesignDiagnosticIndex.value = null
    }

    async function abortGenerationRequest(requestId: string): Promise<void> {
      await OrchestflowGenerationEditorDataSource.abortMessage(requestId)
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
      showDesignManagerModal,
      designManagerPlanningDocumentId,
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
      analysisActivePlanningDocument,
      activeDesignDocument,
      activeDesignPlanningDocument,
      activeDesignDiagnostics,
      selectedDesignDiagnostic,
      selectedDesignDiagnosticIndex,
      activeDesignPreviewDocument,
      designDocumentList,
      filteredDesignDocumentList,
      analysisPlanningViewMode,
      designDocumentViewMode,
      isPlanningDocumentSaving,
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
      openPlanningCopilotFromMessage,
      selectAnalysisPlanningDocument,
      saveActivePlanningDocumentContent,
      applyPlanningCommandProposal,
      rejectPlanningCommandProposal,
      enterDesignView,
      requestDesignBlueprintGeneration,
      openDesignDiagnostics,
      clearDesignDiagnosticSelection,
      abortGenerationRequest,
      createDesignDocumentFromPlanningDocumentId,
      createDesignDocumentFromPlanningMessage,
      openExistingDesignsFromPlanningMessage,
      openDesignManager,
      closeDesignManager,
      selectDesignDocument,
      deleteDesignDocument,
      handleDesignContentUpdate,
      handleStageModelSelect,
      getStageLabel,
      getSessionStageDotClass,
      getDesignDocumentCountByPlanningDocumentId
    }
  }
)
