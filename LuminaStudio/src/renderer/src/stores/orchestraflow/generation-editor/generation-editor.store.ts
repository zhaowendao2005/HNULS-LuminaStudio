import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  GenerationAnalysisDocument,
  GenerationChannelKey,
  GenerationDesignDocument,
  GenerationGlobalSettings,
  GenerationMessageMetaPayload,
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

    // ===================== 流式控制（用于“流式同步”与“暂停丢弃本次内容”） =====================

    // 记录当前正在流式输出的 design-planner assistant messageId
    const currentDesignStreamingMessageId = ref<string | null>(null)

    // 记录每次设计流式开始前的 baseline（用于 abort 后回滚）
    // key = messageId
    const designStreamBaselines = ref<
      Record<string, { designDocumentId: string; baselineContent: string }>
    >({})

    // 用户主动暂停的 messageId（用于 run-finish(aborted) 时避免 refresh 覆盖清空结果）
    const abortedMessageIds = ref<Set<string>>(new Set())

    // runId -> messageId：用于把 artifact-replace/run-finish 关联到具体消息
    const runIdToMessageId = ref<Record<string, string>>({})

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

    function parseMessageMeta(metaJson: string | null): GenerationMessageMetaPayload | null {
      if (!metaJson) return null
      try {
        return JSON.parse(metaJson) as GenerationMessageMetaPayload
      } catch {
        return null
      }
    }

    const designMessages = computed(() => {
      const session = currentSession.value
      if (!session) return []

      const activeDesignId = activeDesignDocument.value?.id || null
      const all = session.messages.filter((item) => item.channelKey === 'design-planner')

      // 设计面板切换“规划设计稿版本”时：
      // - Copilot 消息也要跟随切换
      // - 通过 message.metaJson.artifactDocumentId 绑定消息归属
      if (!activeDesignId) return all

      return all.filter((item) => {
        const meta = parseMessageMeta(item.metaJson)
        return meta?.artifactDocumentId === activeDesignId
      })
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

      // 切换设计稿版本时，同步清理当前输入框（避免把上一份设计稿的输入残留带过来）
      // Copilot 消息列表会通过 designMessages(computed) 自动按 artifactDocumentId 过滤。
      designInput.value = ''

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

    /**
     * 从“需求规划输出（analysis-planner 的结构化规划块）”进入规划设计。
     *
     * 交互目标：
     * - 把 planningMessageId 作为 design document 的 planningSourceMessageId
     * - 这样能形成“快照 --- 设计稿”一对绑定关系，切换规划输出时也能切换到对应设计稿。
     */
    async function startDesignFromPlanningMessage(planningMessageId: string): Promise<void> {
      if (!currentSession.value) return

      // 1) 先尝试在当前会话里找“已经绑定过”的设计稿
      const existing = currentSession.value.designDocuments.find(
        (doc) => doc.planningSourceMessageId === planningMessageId
      )

      if (existing) {
        await selectDesignDocument(existing.id)
      } else {
        // 2) 没有的话，新建一个并绑定 planningSourceMessageId
        requireData(
          await OrchestflowGenerationEditorDataSource.createDesignDocument({
            sessionId: currentSession.value.id,
            title: '设计稿',
            planningSourceMessageId: planningMessageId
          })
        )
        await refreshCurrentSession()

        const created = currentSession.value.designDocuments.find(
          (doc) => doc.planningSourceMessageId === planningMessageId
        )
        if (created) {
          await selectDesignDocument(created.id)
        }
      }

      // 3) 切到“规划设计稿”主面板，并打开右侧 design copilot
      activeMenu.value = 'design'
      designDocumentViewMode.value = 'preview'
      openCopilotPanel('design')
    }

    /**
     * 点击设计面板的“开始设计/继续设计”。
     *
     * 你反馈的“没有反应”，原因是之前按钮只做了 open-copilot，没自动触发一次设计生成。
     * 这里按你的预期补上：
     * - 自动打开右侧 design copilot
     * - 自动发送一条消息给 design-planner（以快照内容作为输入）
     */
    async function startDesignFromDesignPanel(): Promise<void> {
      openCopilotPanel('design')

      // 按你的要求：user 消息只发送固定一句话即可。
      // 设计所需的快照/上下文（analysisDocument、workflowSpec、currentToml 等）会在主进程的 design-planner context 里自动携带。
      await sendMessage('design-planner', '进行规划设计')
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

    /**
     * 暂停/停止某条正在 streaming 的 assistant 消息。
     *
     * 需求约束：
     * - “仅清空本次流式”：清空消息内容 + 回滚本次 design 流式对 textarea 的追加。
     * - 不需要保留部分输出：暂停后就当本次输出没发生。
     */
    async function abortStreamingMessage(message: {
      id: string
      requestId: string | null
    }): Promise<void> {
      if (!currentSession.value) return
      if (!message.requestId) return

      // 标记为“用户主动暂停”，用于 run-finish/artifact-replace 分支跳过 refresh/覆盖。
      abortedMessageIds.value.add(message.id)

      // 1) 立即在前端把消息内容清空（让用户立刻看到效果）
      const targetMessage = currentSession.value.messages.find((item) => item.id === message.id)
      if (targetMessage) {
        targetMessage.status = 'aborted'
        targetMessage.content = ''
      }

      // 2) 若这是 design-planner 当前那条流式消息，则把 textarea 回滚到 baseline
      if (currentDesignStreamingMessageId.value === message.id) {
        const baseline = designStreamBaselines.value[message.id]
        const doc = activeDesignDocument.value
        if (baseline && doc && doc.id === baseline.designDocumentId) {
          doc.content = baseline.baselineContent
        }

        currentDesignStreamingMessageId.value = null
        delete designStreamBaselines.value[message.id]
      }

      // 3) 通知主进程把 run 标记为 aborted（后续会收到 run-finish(aborted)）
      await OrchestflowGenerationEditorDataSource.abortMessage(message.requestId)
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

        // run-start：记录 runId -> messageId，并为 design-planner 做 baseline 备份
        if (event.type === 'run-start') {
          runIdToMessageId.value[event.runId] = event.messageId

          if (event.channelKey === 'design-planner') {
            currentDesignStreamingMessageId.value = event.messageId

            // 保存 baseline，用于“暂停/停止生成”时回滚（丢掉本次流式内容）
            const doc = activeDesignDocument.value
            if (doc) {
              designStreamBaselines.value[event.messageId] = {
                designDocumentId: doc.id,
                baselineContent: doc.content || ''
              }

              // 进入设计流式时，把 textarea 切到“设计稿视图”，并清空显示内容（baseline 已保存）
              designDocumentViewMode.value = 'dsl'
              doc.content = ''
              doc.summary = ''
            }
          }

          return
        }

        // 流式增量：直接拼到对应的 assistant message 上
        // 同时：若这是 design-planner 当前那条 message，则把 delta 也同步追加到设计稿 textarea（doc.content）
        if (event.type === 'text-delta') {
          const targetMessage = currentSession.value.messages.find(
            (item) => item.id === event.messageId
          )
          if (targetMessage) {
            targetMessage.content = `${targetMessage.content || ''}${event.delta}`
            targetMessage.status = 'streaming'
          }

          if (event.messageId === currentDesignStreamingMessageId.value) {
            const doc = activeDesignDocument.value
            if (doc) {
              doc.content = `${doc.content || ''}${event.delta}`
            }
          }

          return
        }

        // 结束：
        // - completed：刷新一次会话，拿到最终 content/status（以及后端落库后的任何修正）
        // - aborted：不要刷新（否则会把后端残留内容覆盖回 UI 的清空状态）
        if (event.type === 'run-finish') {
          const belongsToCurrentSession = currentSession.value.messages.some(
            (item) => item.id === event.messageId
          )
          if (!belongsToCurrentSession) return

          if (event.status === 'aborted' || abortedMessageIds.value.has(event.messageId)) {
            const targetMessage = currentSession.value.messages.find(
              (item) => item.id === event.messageId
            )
            if (targetMessage) {
              targetMessage.status = 'aborted'
              targetMessage.content = ''
            }

            // 清理 design 流式标记
            if (currentDesignStreamingMessageId.value === event.messageId) {
              currentDesignStreamingMessageId.value = null
              delete designStreamBaselines.value[event.messageId]
            }

            return
          }

          void refreshCurrentSession()
          return
        }

        // 错误：不要刷新（刷新会把流式内容覆盖成后端 error 文本），直接标记失败并附加错误信息
        if (event.type === 'run-error') {
          const targetMessage = currentSession.value.messages.find(
            (item) => item.id === event.messageId
          )
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
          // aborted 情况：不处理 artifact-replace，避免把“暂停后丢弃的内容”又覆盖回来。
          const messageId = runIdToMessageId.value[event.runId]
          if (messageId && abortedMessageIds.value.has(messageId)) {
            return
          }

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
      startDesignFromPlanningMessage,
      startDesignFromDesignPanel,
      deleteDesignDocument,
      sendMessage,
      abortStreamingMessage,
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
