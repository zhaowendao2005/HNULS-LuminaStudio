import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { McpChatMessage, McpChatServerCatalogItem, McpChatSession } from '@preload/types'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import { McpChatDataSource } from './datasource'
import type { McpChatRawEntry, McpChatRuntimeState, McpChatSessionViewModel } from './types'

function makePendingMessage(sessionId: string, text: string): McpChatMessage {
  return {
    id: `${sessionId}-pending-assistant`,
    role: 'assistant',
    text,
    createdAt: new Date().toISOString()
  }
}

export const useMcpChatStore = defineStore('mcp-chat', () => {
  const state = ref<McpChatRuntimeState>({
    sessions: [],
    servers: [],
    selectedSessionId: null,
    pendingAssistantTextBySession: {},
    rawEntriesBySession: {},
    currentRequestId: null,
    statusText: '',
    memoryRoundsDefault: 10,
    enableAgentMode: false,
    agentMaxRounds: 3,
    rightPanelWidth: 360,
    activeTab: 'tools',
    loading: false,
    error: null
  })

  let disposeStream: (() => void) | null = null

  const selectedSession = computed<McpChatSessionViewModel | null>(() => {
    const session =
      state.value.sessions.find((item) => item.id === state.value.selectedSessionId) || null
    if (!session) return null
    const pendingAssistantText = state.value.pendingAssistantTextBySession[session.id] || ''
    const rawEntries = state.value.rawEntriesBySession[session.id] || []
    const displayMessages = pendingAssistantText
      ? [...session.messages, makePendingMessage(session.id, pendingAssistantText)]
      : session.messages
    return {
      ...session,
      pendingAssistantText,
      rawEntries,
      displayMessages
    }
  })

  const groupedServerTree = computed(() => {
    const session = selectedSession.value
    const enabledServers = new Set(session?.enabledServerIds || [])
    const enabledToolKeys = new Set(session?.enabledToolKeys || [])
    return state.value.servers.map((server) => ({
      ...server,
      checked: enabledServers.has(server.id),
      tools: server.tools.map((tool) => ({
        ...tool,
        checked: enabledToolKeys.has(tool.key)
      }))
    }))
  })

  async function initialize(): Promise<void> {
    if (state.value.loading) return
    state.value.loading = true
    state.value.error = null
    try {
      const modelConfigStore = useModelConfigStore()
      await modelConfigStore.fetchProviders()
      const bootstrap = await McpChatDataSource.getBootstrap()
      state.value.sessions = bootstrap.sessions
      state.value.servers = bootstrap.servers
      state.value.memoryRoundsDefault = bootstrap.settings.memoryRoundsDefault
      state.value.enableAgentMode = bootstrap.settings.enableAgentMode
      state.value.agentMaxRounds = bootstrap.settings.agentMaxRounds
      state.value.selectedSessionId = bootstrap.sessions[0]?.id || null
      ensureStreamSubscription()

      if (!state.value.selectedSessionId) {
        await createSession()
      }
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : String(error)
    } finally {
      state.value.loading = false
    }
  }

  function ensureStreamSubscription(): void {
    if (disposeStream) return
    disposeStream = McpChatDataSource.onStream((event) => {
      if (event.type === 'session-snapshot') {
        upsertSession(event.session)
        return
      }

      if (!event.sessionId) return

      if (event.type === 'assistant-chunk') {
        state.value.pendingAssistantTextBySession[event.sessionId] =
          (state.value.pendingAssistantTextBySession[event.sessionId] || '') + event.delta
        return
      }

      if (event.type === 'status') {
        state.value.statusText = event.message
        state.value.currentRequestId = event.requestId
        return
      }

      if (event.type === 'raw-json') {
        appendRawEntry(event.sessionId, event.label, event.payload)
        return
      }

      if (event.type === 'tool-call') {
        appendRawEntry(event.sessionId, `tool-call:${event.toolKey}`, event.arguments)
        return
      }

      if (event.type === 'tool-result') {
        appendRawEntry(event.sessionId, `tool-result:${event.toolKey}`, event.result)
        return
      }

      if (event.type === 'finish') {
        delete state.value.pendingAssistantTextBySession[event.sessionId]
        state.value.currentRequestId = null
        state.value.statusText = ''
        return
      }

      if (event.type === 'error') {
        state.value.error = event.message
        state.value.currentRequestId = null
        state.value.statusText = ''
        return
      }
    })
  }

  function upsertSession(session: McpChatSession): void {
    state.value.sessions = [
      session,
      ...state.value.sessions.filter((item) => item.id !== session.id)
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    if (!state.value.selectedSessionId) {
      state.value.selectedSessionId = session.id
    }
    if (session.messages.length > 0) {
      delete state.value.pendingAssistantTextBySession[session.id]
    }
  }

  function appendRawEntry(sessionId: string, label: string, payload: unknown): void {
    const current = state.value.rawEntriesBySession[sessionId] || []
    const next: McpChatRawEntry = {
      id: crypto.randomUUID(),
      label,
      payload,
      createdAt: new Date().toISOString()
    }
    state.value.rawEntriesBySession = {
      ...state.value.rawEntriesBySession,
      [sessionId]: [next, ...current].slice(0, 50)
    }
  }

  async function refreshServers(): Promise<void> {
    state.value.servers = await McpChatDataSource.refreshServers()
    const session = selectedSession.value
    if (session) {
      // 工具目录刷新后，顺手裁剪掉已经失效的 server / tool 选择，避免 UI 保存脏引用。
      const validServerIds = new Set(state.value.servers.map((server) => server.id))
      const validToolKeys = new Set(
        state.value.servers.flatMap((server) => server.tools.map((tool) => tool.key))
      )
      await updateSession(session.id, {
        enabledServerIds: session.enabledServerIds.filter((id) => validServerIds.has(id)),
        enabledToolKeys: session.enabledToolKeys.filter((key) => validToolKeys.has(key))
      })
    }
  }

  async function createSession(): Promise<void> {
    const modelConfigStore = useModelConfigStore()
    const provider = modelConfigStore.selectedProvider || modelConfigStore.providers[0]
    const model = provider?.models[0]

    if (!provider || !model) {
      throw new Error('请先在模型配置中准备至少一个可用模型。')
    }

    const session = await McpChatDataSource.createSession({
      providerId: provider.id,
      modelId: model.id,
      memoryRounds: state.value.memoryRoundsDefault
    })
    upsertSession(session)
    state.value.selectedSessionId = session.id
  }

  async function updateSession(sessionId: string, patch: Partial<McpChatSession>): Promise<void> {
    const session = await McpChatDataSource.updateSession({ sessionId, patch })
    upsertSession(session)
  }

  async function deleteCurrentSession(): Promise<void> {
    if (!state.value.selectedSessionId) return
    const deletingId = state.value.selectedSessionId
    await McpChatDataSource.deleteSession(deletingId)
    state.value.sessions = state.value.sessions.filter((item) => item.id !== deletingId)
    delete state.value.pendingAssistantTextBySession[deletingId]
    delete state.value.rawEntriesBySession[deletingId]
    state.value.selectedSessionId = state.value.sessions[0]?.id || null
    if (!state.value.selectedSessionId) {
      await createSession()
    }
  }

  async function sendMessage(input: string): Promise<void> {
    const session = selectedSession.value
    if (!session) return
    state.value.error = null
    state.value.rawEntriesBySession = {
      ...state.value.rawEntriesBySession,
      [session.id]: []
    }
    const result = await McpChatDataSource.sendMessage(session.id, input)
    state.value.currentRequestId = result.requestId
    state.value.pendingAssistantTextBySession[session.id] = ''
  }

  async function abortCurrentRequest(): Promise<void> {
    if (!state.value.currentRequestId) return
    await McpChatDataSource.abort(state.value.currentRequestId)
    state.value.currentRequestId = null
    state.value.statusText = ''
  }

  async function saveSettings(): Promise<void> {
    const result = await McpChatDataSource.saveSettings({
      memoryRoundsDefault: state.value.memoryRoundsDefault,
      enableAgentMode: state.value.enableAgentMode,
      agentMaxRounds: state.value.agentMaxRounds
    })
    state.value.memoryRoundsDefault = result.memoryRoundsDefault
    state.value.enableAgentMode = result.enableAgentMode
    state.value.agentMaxRounds = result.agentMaxRounds
  }

  async function toggleServer(server: McpChatServerCatalogItem, checked: boolean): Promise<void> {
    const session = selectedSession.value
    if (!session) return
    const enabledServerIds = checked
      ? [...new Set([...session.enabledServerIds, server.id])]
      : session.enabledServerIds.filter((id) => id !== server.id)
    const allowedToolKeys = new Set(
      state.value.servers
        .filter((item) => enabledServerIds.includes(item.id))
        .flatMap((item) => item.tools.map((tool) => tool.key))
    )
    await updateSession(session.id, {
      enabledServerIds,
      enabledToolKeys: session.enabledToolKeys.filter((key) => allowedToolKeys.has(key))
    })
  }

  async function toggleTool(serverId: string, toolKey: string, checked: boolean): Promise<void> {
    const session = selectedSession.value
    if (!session) return
    const enabledServerIds = session.enabledServerIds.includes(serverId)
      ? session.enabledServerIds
      : [...session.enabledServerIds, serverId]
    const enabledToolKeys = checked
      ? [...new Set([...session.enabledToolKeys, toolKey])]
      : session.enabledToolKeys.filter((key) => key !== toolKey)
    await updateSession(session.id, {
      enabledServerIds,
      enabledToolKeys
    })
  }

  return {
    state,
    selectedSession,
    groupedServerTree,
    initialize,
    refreshServers,
    createSession,
    updateSession,
    deleteCurrentSession,
    sendMessage,
    abortCurrentRequest,
    saveSettings,
    toggleServer,
    toggleTool
  }
})
