import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  OrchestflowGenerationEditorDataSource,
  resolveMenuByStage
} from './generation-editor.datasource'
import {
  mapSessionDetail,
  mapSessionSummary,
  type GenerateCopilotMode,
  type GenerateMenuValue,
  type GenerateSessionDetailViewModel,
  type GenerateSessionViewModel
} from './generation-editor.types'
import type {
  GenerationChannelKey,
  GenerationDocument,
  GenerationMessage,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'

/**
 * GenerateView 的单一事实来源。
 *
 * 这里接管：
 * - 会话列表 / 当前会话
 * - 三阶段模型选择与抽屉配置
 * - 三阶段文档正文
 * - 4 条 AI 对话通道
 */
export const useOrchestflowGenerationEditorStore = defineStore(
  'orchestflow-generation-editor',
  () => {
    const sessions = ref<GenerateSessionViewModel[]>([])
    const sessionDetails = ref<Record<string, GenerateSessionDetailViewModel>>({})
    const selectedSessionId = ref<string | null>(null)
    const activeMenu = ref<GenerateMenuValue>('analysis')
    const activeRightPanel = ref<GenerateCopilotMode | null>(null)
    const isLeftSidebarCollapsed = ref(false)
    const isRightPanelFullscreen = ref(false)
    const showCreateSessionModal = ref(false)
    const showConfigDrawer = ref(false)
    const showModelSelector = ref(false)
    const newSessionName = ref('')
    const analysisInput = ref('')
    const copilotInput = ref('')
    const loading = ref(false)
    const streamMessageIdByRequest = ref<Record<string, string>>({})
    const activeRequestIdByChannel = ref<Partial<Record<GenerationChannelKey, string>>>({})

    const isAnalysisStreaming = computed(() => {
      return Boolean(activeRequestIdByChannel.value['analysis-discussion'])
    })

    const isActiveCopilotStreaming = computed(() => {
      if (!activeRightPanel.value) return false
      return Boolean(activeRequestIdByChannel.value[getChannelKeyByMode(activeRightPanel.value)])
    })

    const currentSession = computed<GenerateSessionDetailViewModel | null>(() => {
      if (!selectedSessionId.value) return null
      return sessionDetails.value[selectedSessionId.value] ?? null
    })

    const currentStageKey = computed<GenerationStageKey>(() => {
      if (activeMenu.value === 'analysis') return 'analysis'
      if (activeMenu.value === 'design') return 'design'
      return 'verify'
    })

    const currentStageConfig = computed<GenerationStageConfig | null>(() => {
      return currentSession.value?.stageConfigs[currentStageKey.value] ?? null
    })

    const configDrawerTab = ref<GenerationStageKey>('analysis')

    const configDrawerStageConfig = computed(() => {
      return currentSession.value?.stageConfigs[configDrawerTab.value] ?? null
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
      return currentSession.value?.messagesByChannel['analysis-discussion'] ?? []
    })

    const activeCopilotMessages = computed<GenerationMessage[]>(() => {
      if (!currentSession.value || !activeRightPanel.value) return []
      return currentSession.value.messagesByChannel[getChannelKeyByMode(activeRightPanel.value)]
    })

    const activeCopilotDocument = computed<GenerationDocument | null>(() => {
      if (!currentSession.value || !activeRightPanel.value) return null
      if (activeRightPanel.value === 'analysis') return currentSession.value.documents.analysis
      if (activeRightPanel.value === 'design') return currentSession.value.documents.design
      return currentSession.value.documents.verify
    })

    const dashboardStageCards = computed(() => {
      return [
        {
          stage: 'analysis',
          label: '未完成需求分析',
          count: sessions.value.filter((item) => item.currentStage === 'analysis').length,
          color: 'bg-cyan-500'
        },
        {
          stage: 'design',
          label: '未完成设计',
          count: sessions.value.filter((item) => item.currentStage === 'design').length,
          color: 'bg-emerald-500'
        },
        {
          stage: 'verify',
          label: '未完成校验',
          count: sessions.value.filter((item) => item.currentStage === 'verify').length,
          color: 'bg-violet-500'
        },
        {
          stage: 'workflow',
          label: '未生成工作流',
          count: sessions.value.filter((item) => item.currentStage === 'workflow').length,
          color: 'bg-amber-500'
        }
      ]
    })

    const plannedSessionsCount = computed(
      () => sessions.value.filter((item) => item.planGenerated).length
    )

    async function initialize(): Promise<void> {
      if (loading.value) return
      loading.value = true
      try {
        const rows = await OrchestflowGenerationEditorDataSource.listSessions()
        sessions.value = rows.map(mapSessionSummary)

        if (rows.length === 0) {
          const created = await OrchestflowGenerationEditorDataSource.createSession({
            title: '新建生成会话'
          })
          upsertSessionDetail(created)
          selectedSessionId.value = created.id
        } else {
          selectedSessionId.value = rows[0].id
          await refreshSessionDetail(rows[0].id)
        }
      } finally {
        loading.value = false
      }
    }

    function bindStreamListener(): () => void {
      return OrchestflowGenerationEditorDataSource.onStream((event) => {
        const detail = sessionDetails.value[event.sessionId]
        if (!detail) return

        if (event.type === 'stream-start') {
          // 这里要把“前端本地占位消息”和“数据库真实消息”对齐，否则后续 delta 会找不到目标消息。
          const target = findStreamMessage(
            detail,
            event.channelKey,
            event.requestId,
            event.messageId
          )
          if (target) {
            target.id = event.messageId
            target.requestId = event.requestId
            target.status = 'streaming'
          }
          streamMessageIdByRequest.value[event.requestId] = event.messageId
          activeRequestIdByChannel.value[event.channelKey] = event.requestId
          return
        }

        const target = findStreamMessage(detail, event.channelKey, event.requestId, event.messageId)
        if (!target) return

        if (event.type === 'text-delta') {
          target.content += event.delta
          target.status = 'streaming'
          target.requestId = event.requestId
          return
        }

        if (event.type === 'error') {
          target.error = event.message
          target.status = 'error'
          target.requestId = event.requestId
          delete activeRequestIdByChannel.value[event.channelKey]
          delete streamMessageIdByRequest.value[event.requestId]
          void refreshSessionDetail(event.sessionId)
          return
        }

        if (event.type === 'finish') {
          target.status =
            event.finishReason === 'stop'
              ? 'final'
              : event.finishReason === 'aborted'
                ? 'aborted'
                : 'error'
          target.requestId = event.requestId
          target.usageJson = event.usageJson ?? null
          delete activeRequestIdByChannel.value[event.channelKey]
          delete streamMessageIdByRequest.value[event.requestId]
          void refreshSessionDetail(event.sessionId)
        }
      })
    }

    async function selectSession(sessionId: string): Promise<void> {
      selectedSessionId.value = sessionId
      activeMenu.value = resolveMenuByStage(
        sessions.value.find((item) => item.id === sessionId)?.currentStage || 'analysis'
      )
      await refreshSessionDetail(sessionId)
    }

    async function createSession(): Promise<void> {
      const title = newSessionName.value.trim()
      if (!title) return
      const detail = await OrchestflowGenerationEditorDataSource.createSession({ title })
      upsertSessionDetail(detail)
      selectedSessionId.value = detail.id
      newSessionName.value = ''
      showCreateSessionModal.value = false
      activeMenu.value = 'analysis'
    }

    async function saveCurrentStageConfig(partial: Partial<GenerationStageConfig>): Promise<void> {
      if (!currentSession.value || !currentStageConfig.value) return
      const nextConfig: GenerationStageConfig = {
        ...currentStageConfig.value,
        ...partial
      }
      currentSession.value.stageConfigs[nextConfig.stageKey] = nextConfig
      await OrchestflowGenerationEditorDataSource.saveStageConfig({
        sessionId: currentSession.value.id,
        config: nextConfig
      })
    }

    async function saveConfigDrawerStageConfig(
      partial: Partial<GenerationStageConfig>
    ): Promise<void> {
      if (!currentSession.value || !configDrawerStageConfig.value) return
      const nextConfig: GenerationStageConfig = {
        ...configDrawerStageConfig.value,
        ...partial
      }
      currentSession.value.stageConfigs[nextConfig.stageKey] = nextConfig
      await OrchestflowGenerationEditorDataSource.saveStageConfig({
        sessionId: currentSession.value.id,
        config: nextConfig
      })
    }

    async function saveDocument(document: GenerationDocument): Promise<void> {
      if (!currentSession.value) return
      currentSession.value.documents[document.documentKey] = document
      await OrchestflowGenerationEditorDataSource.saveDocument({
        sessionId: currentSession.value.id,
        document
      })
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
      mergeSessionSummary(updated)
    }

    async function sendAnalysisMessage(): Promise<void> {
      if (!currentSession.value) {
        return
      }
      if (!currentStageConfig.value?.providerId || !currentStageConfig.value.modelId) {
        // 没选模型时不要静默失败，直接拉起模型选择器，避免用户以为“发送按钮坏了”。
        showModelSelector.value = true
        return
      }
      const content = analysisInput.value.trim()
      if (!content) return
      analysisInput.value = ''
      await appendOptimisticAndSend('analysis-discussion', content, currentStageConfig.value)
      await updateSessionState({
        analysisTurnCount: currentSession.value.analysisTurnCount + 1,
        summary: '需求讨论已进入真实对话持久化链路。'
      })
    }

    async function sendCopilotMessage(): Promise<void> {
      if (!currentSession.value || !activeRightPanel.value) return
      const config = currentSession.value.stageConfigs[activeRightPanel.value]
      if (!config.providerId || !config.modelId) {
        // copilot 侧同样处理成显式引导，避免输入后点击发送没有任何反应。
        showModelSelector.value = true
        return
      }
      const content = copilotInput.value.trim()
      if (!content) return
      copilotInput.value = ''
      await appendOptimisticAndSend(getChannelKeyByMode(activeRightPanel.value), content, config)
    }

    async function appendOptimisticAndSend(
      channelKey: GenerationChannelKey,
      content: string,
      config: GenerationStageConfig
    ): Promise<void> {
      if (!currentSession.value) return

      const messages = currentSession.value.messagesByChannel[channelKey]
      messages.push({
        id: crypto.randomUUID(),
        sessionId: currentSession.value.id,
        channelKey,
        requestId: null,
        role: 'user',
        content,
        status: 'final',
        providerId: config.providerId,
        modelId: config.modelId,
        error: null,
        usageJson: null,
        metaJson: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const assistantId = crypto.randomUUID()
      messages.push({
        id: assistantId,
        sessionId: currentSession.value.id,
        channelKey,
        requestId: null,
        role: 'assistant',
        content: '',
        status: 'streaming',
        providerId: config.providerId,
        modelId: config.modelId,
        error: null,
        usageJson: null,
        metaJson: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const result = await OrchestflowGenerationEditorDataSource.sendMessage({
        sessionId: currentSession.value.id,
        channelKey,
        providerId: config.providerId!,
        modelId: config.modelId!,
        content
      })

      // 先把 requestId 绑到本地占位 assistant 上，哪怕 stream-start 先/后到，都能继续命中同一条消息。
      const target = messages.find((item) => item.id === assistantId)
      if (target) {
        target.requestId = result.requestId
      }
      streamMessageIdByRequest.value[result.requestId] = assistantId
    }

    async function toggleAutoApproved(): Promise<void> {
      if (!currentSession.value || !activeRightPanel.value) return
      const stageKey = activeRightPanel.value
      const config = currentSession.value.stageConfigs[stageKey]
      const nextConfig: GenerationStageConfig = {
        ...config,
        stageKey,
        autoApproved: !config.autoApproved
      }
      currentSession.value.stageConfigs[stageKey] = nextConfig
      await OrchestflowGenerationEditorDataSource.saveStageConfig({
        sessionId: currentSession.value.id,
        config: nextConfig
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
      const nextDocument = {
        ...currentSession.value.documents.design,
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

    async function refreshSessionDetail(sessionId: string): Promise<void> {
      const detail = await OrchestflowGenerationEditorDataSource.getSessionDetail(sessionId)
      upsertSessionDetail(detail)
    }

    function findStreamMessage(
      detail: GenerateSessionDetailViewModel,
      channelKey: GenerationChannelKey,
      requestId: string,
      messageId: string
    ): GenerationMessage | undefined {
      const channelMessages = detail.messagesByChannel[channelKey]
      const mappedId = streamMessageIdByRequest.value[requestId]
      return channelMessages.find(
        (item) =>
          item.id === messageId ||
          item.id === mappedId ||
          (item.requestId === requestId && item.role === 'assistant')
      )
    }

    function upsertSessionDetail(detail: any): void {
      const mapped = mapSessionDetail(detail)
      sessionDetails.value[mapped.id] = mapped
      mergeSessionSummary(mapped)
    }

    function mergeSessionSummary(summary: GenerateSessionViewModel): void {
      const index = sessions.value.findIndex((item) => item.id === summary.id)
      if (index >= 0) {
        sessions.value[index] = summary
      } else {
        sessions.value.unshift(summary)
      }
      if (sessionDetails.value[summary.id]) {
        sessionDetails.value[summary.id] = {
          ...sessionDetails.value[summary.id],
          ...summary
        }
      }
    }

    return {
      sessions,
      selectedSessionId,
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
      initialize,
      bindStreamListener,
      selectSession,
      createSession,
      saveCurrentStageConfig,
      saveConfigDrawerStageConfig,
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

function getChannelKeyByMode(mode: GenerateCopilotMode): GenerationChannelKey {
  if (mode === 'analysis') return 'analysis-copilot'
  if (mode === 'design') return 'design-copilot'
  return 'verify-copilot'
}
