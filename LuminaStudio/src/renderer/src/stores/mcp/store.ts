import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { McpChatStreamEvent, McpServerPreset } from '@preload/types'
import type {
  ChatMessage,
  MetaBlock,
  ThinkingBlock,
  ToolBlock
} from '@renderer/stores/ai-chat/types'
import { McpDataSource } from './datasource'
import type { McpPresetDraft, McpWorkbenchState } from './types'

const DEFAULT_STDIO_DRAFT: McpPresetDraft = {
  id: '',
  name: 'Everything Server',
  transport: 'stdio',
  command: 'npx',
  argsText: '-y @modelcontextprotocol/server-everything',
  cwd: '',
  envText: ''
}

export const useMcpStore = defineStore('mcp-workbench', () => {
  const state = ref<McpWorkbenchState>({
    presets: [],
    sessions: [],
    activeSessionId: null,
    tools: [],
    prompts: [],
    resources: [],
    traces: [],
    selectedToolName: null,
    selectedPromptName: null,
    selectedResourceUri: null,
    toolResult: null,
    promptResult: null,
    resourceResult: null,
    chat: {
      messages: [],
      userInput: '',
      selectedSessionIds: [],
      mcpEnabled: true,
      currentProviderId: null,
      currentModelId: null,
      enableThinking: false,
      activeRequestId: null
    },
    activeStage: 'connect',
    toolsMode: 'visual',
    promptsMode: 'visual',
    resourcesMode: 'visual',
    rawTraceOpen: false,
    loading: false,
    error: null
  })

  let disposeSessionEvent: (() => void) | null = null
  let disposeTraceEvent: (() => void) | null = null
  let disposeChatStream: (() => void) | null = null

  const activeSession = computed(
    () =>
      state.value.sessions.find((session) => session.sessionId === state.value.activeSessionId) ??
      null
  )
  const activeTool = computed(
    () => state.value.tools.find((tool) => tool.name === state.value.selectedToolName) ?? null
  )
  const activePrompt = computed(
    () =>
      state.value.prompts.find((prompt) => prompt.name === state.value.selectedPromptName) ?? null
  )
  const activeResource = computed(
    () =>
      state.value.resources.find((resource) => resource.uri === state.value.selectedResourceUri) ??
      null
  )
  const connectedSessions = computed(() =>
    state.value.sessions.filter((session) => session.connected)
  )

  async function initialize(): Promise<void> {
    state.value.loading = true
    try {
      const [presets, sessions] = await Promise.all([
        McpDataSource.listPresets(),
        McpDataSource.listSessionStates()
      ])
      state.value.presets = presets
      state.value.sessions = sessions
      state.value.activeSessionId = sessions[0]?.sessionId ?? null
      ensureSubscriptions()
      if (state.value.activeSessionId) {
        await refreshWorkspaceData()
      }
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : String(error)
    } finally {
      state.value.loading = false
    }
  }

  function ensureSubscriptions(): void {
    if (!disposeSessionEvent) {
      disposeSessionEvent = McpDataSource.onSessionEvent((session) => {
        const rest = state.value.sessions.filter((item) => item.sessionId !== session.sessionId)
        const nextSessions = [...rest, session].sort((a, b) =>
          (a.presetName || '').localeCompare(b.presetName || '')
        )
        state.value.sessions = nextSessions
        if (
          !state.value.activeSessionId ||
          !nextSessions.some((item) => item.sessionId === state.value.activeSessionId)
        ) {
          state.value.activeSessionId =
            nextSessions.find((item) => item.connected)?.sessionId ??
            nextSessions[0]?.sessionId ??
            null
        }
      })
    }
    if (!disposeTraceEvent) {
      disposeTraceEvent = McpDataSource.onTrace((event) => {
        state.value.traces = [...state.value.traces.slice(-199), event]
      })
    }
    if (!disposeChatStream) {
      disposeChatStream = McpDataSource.onChatStream(handleChatStreamEvent)
    }
  }

  async function savePreset(preset: McpServerPreset): Promise<void> {
    state.value.presets = await McpDataSource.savePreset(preset)
  }

  async function deletePreset(presetId: string): Promise<void> {
    const deletedSessions = state.value.sessions.filter((item) => item.presetId === presetId)
    await Promise.all(
      deletedSessions.map((item) => McpDataSource.disconnect(item.sessionId).catch(() => null))
    )
    state.value.sessions = state.value.sessions.filter((item) => item.presetId !== presetId)
    state.value.chat.selectedSessionIds = state.value.chat.selectedSessionIds.filter(
      (sessionId) => !deletedSessions.some((item) => item.sessionId === sessionId)
    )
    state.value.presets = await McpDataSource.deletePreset(presetId)
    if (deletedSessions.some((item) => item.sessionId === state.value.activeSessionId)) {
      state.value.activeSessionId = state.value.sessions[0]?.sessionId ?? null
      await refreshWorkspaceData()
    }
  }

  async function connectPreset(presetId: string): Promise<void> {
    state.value.loading = true
    state.value.error = null
    try {
      const preset = state.value.presets.find((item) => item.id === presetId)
      if (!preset) {
        throw new Error(`Preset not found: ${presetId}`)
      }
      const session = await McpDataSource.connect(preset)
      state.value.activeSessionId = session.sessionId
      state.value.activeStage = 'tools'
      if (!state.value.chat.selectedSessionIds.includes(session.sessionId)) {
        state.value.chat.selectedSessionIds = [
          ...state.value.chat.selectedSessionIds,
          session.sessionId
        ]
      }
      await refreshWorkspaceData()
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function disconnect(sessionId?: string): Promise<void> {
    const targetId = sessionId ?? state.value.activeSessionId
    if (!targetId) return
    await McpDataSource.disconnect(targetId)
    state.value.sessions = state.value.sessions.filter((item) => item.sessionId !== targetId)
    state.value.chat.selectedSessionIds = state.value.chat.selectedSessionIds.filter(
      (item) => item !== targetId
    )
    if (state.value.activeSessionId === targetId) {
      state.value.activeSessionId = state.value.sessions[0]?.sessionId ?? null
      await refreshWorkspaceData()
    }
  }

  async function setActiveSession(sessionId: string): Promise<void> {
    state.value.activeSessionId = sessionId
    await refreshWorkspaceData()
  }

  async function refreshWorkspaceData(): Promise<void> {
    const sessionId = state.value.activeSessionId
    if (!sessionId) {
      state.value.tools = []
      state.value.prompts = []
      state.value.resources = []
      state.value.selectedToolName = null
      state.value.selectedPromptName = null
      state.value.selectedResourceUri = null
      return
    }

    const session = state.value.sessions.find((item) => item.sessionId === sessionId)
    if (!session?.connected) {
      state.value.tools = []
      state.value.prompts = []
      state.value.resources = []
      return
    }

    const toolsPromise = session.capabilities?.tools
      ? McpDataSource.listTools(sessionId)
      : Promise.resolve([])
    const promptsPromise = session.capabilities?.prompts
      ? McpDataSource.listPrompts(sessionId)
      : Promise.resolve([])
    const resourcesPromise = session.capabilities?.resources
      ? McpDataSource.listResources(sessionId)
      : Promise.resolve([])

    const [tools, prompts, resources] = await Promise.all([
      toolsPromise,
      promptsPromise,
      resourcesPromise
    ])
    state.value.tools = tools
    state.value.prompts = prompts
    state.value.resources = resources
    state.value.selectedToolName = tools[0]?.name ?? null
    state.value.selectedPromptName = prompts[0]?.name ?? null
    state.value.selectedResourceUri = resources[0]?.uri ?? null
  }

  async function runTool(args?: Record<string, unknown>): Promise<void> {
    const sessionId = state.value.activeSessionId
    if (!sessionId || !state.value.selectedToolName) return
    state.value.toolResult = await McpDataSource.callTool(
      sessionId,
      state.value.selectedToolName,
      args
    )
  }

  async function renderPrompt(args?: Record<string, string>): Promise<void> {
    const sessionId = state.value.activeSessionId
    if (!sessionId || !state.value.selectedPromptName) return
    state.value.promptResult = await McpDataSource.getPrompt(
      sessionId,
      state.value.selectedPromptName,
      args
    )
  }

  async function loadResource(): Promise<void> {
    const sessionId = state.value.activeSessionId
    if (!sessionId || !state.value.selectedResourceUri) return
    state.value.resourceResult = await McpDataSource.readResource(
      sessionId,
      state.value.selectedResourceUri
    )
  }

  function toggleChatSession(sessionId: string): void {
    if (state.value.chat.selectedSessionIds.includes(sessionId)) {
      state.value.chat.selectedSessionIds = state.value.chat.selectedSessionIds.filter(
        (item) => item !== sessionId
      )
      return
    }
    state.value.chat.selectedSessionIds = [...state.value.chat.selectedSessionIds, sessionId]
  }

  function clearChatMessages(): void {
    state.value.chat.messages = []
  }

  async function sendChatMessage(): Promise<void> {
    const input = state.value.chat.userInput.trim()
    if (!input || state.value.chat.activeRequestId) {
      return
    }
    if (!state.value.chat.currentProviderId || !state.value.chat.currentModelId) {
      throw new Error('Model is not selected')
    }
    if (
      state.value.chat.mcpEnabled &&
      state.value.chat.selectedSessionIds.filter((sessionId) =>
        state.value.sessions.some((item) => item.sessionId === sessionId && item.connected)
      ).length === 0
    ) {
      throw new Error('At least one connected MCP session is required')
    }

    const nextMessages = [
      ...state.value.chat.messages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        blocks: [{ type: 'text', content: input }],
        status: 'final'
      } as ChatMessage
    ]
    state.value.chat.messages = nextMessages
    state.value.chat.userInput = ''
    const requestId = crypto.randomUUID()
    state.value.chat.activeRequestId = requestId
    await McpDataSource.startChat({
      requestId,
      providerId: state.value.chat.currentProviderId,
      modelId: state.value.chat.currentModelId,
      enableThinking: state.value.chat.enableThinking,
      mcpEnabled: state.value.chat.mcpEnabled,
      sessionIds: state.value.chat.selectedSessionIds,
      messages: nextMessages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.blocks
          .filter((block) => block.type === 'text')
          .map((block) => block.content)
          .join('\n')
      }))
    })
  }

  async function abortChat(): Promise<void> {
    if (!state.value.chat.activeRequestId) return
    await McpDataSource.abortChat(state.value.chat.activeRequestId)
  }

  function setChatModel(providerId: string, modelId: string): void {
    state.value.chat.currentProviderId = providerId
    state.value.chat.currentModelId = modelId
  }

  function handleChatStreamEvent(event: McpChatStreamEvent): void {
    switch (event.type) {
      case 'stream-start': {
        state.value.chat.activeRequestId = event.requestId
        state.value.chat.messages = [
          ...state.value.chat.messages,
          {
            id: `assistant-${event.requestId}`,
            role: 'assistant',
            blocks: [],
            isStreaming: true,
            status: 'streaming'
          }
        ]
        break
      }
      case 'text-delta': {
        const message = getActiveAssistantMessage(event.requestId)
        if (!message) break
        const lastBlock = message.blocks[message.blocks.length - 1]
        if (lastBlock?.type === 'text') {
          lastBlock.content += event.delta
        } else {
          message.blocks.push({ type: 'text', content: event.delta })
        }
        break
      }
      case 'reasoning-start': {
        const message = getActiveAssistantMessage(event.requestId)
        if (!message) break
        const block: ThinkingBlock = {
          type: 'thinking',
          steps: [{ id: event.id, content: '' }],
          isThinking: true
        }
        message.blocks.push(block)
        break
      }
      case 'reasoning-delta': {
        const message = getActiveAssistantMessage(event.requestId)
        if (!message) break
        const block = [...message.blocks].reverse().find((item) => item.type === 'thinking') as
          | ThinkingBlock
          | undefined
        if (block) {
          const step = block.steps.find((item) => item.id === event.id)
          if (step) {
            step.content += event.delta
          } else {
            block.steps.push({ id: event.id, content: event.delta })
          }
        }
        break
      }
      case 'reasoning-end': {
        const message = getActiveAssistantMessage(event.requestId)
        if (!message) break
        const block = [...message.blocks].reverse().find((item) => item.type === 'thinking') as
          | ThinkingBlock
          | undefined
        if (block) {
          block.isThinking = false
        }
        break
      }
      case 'tool-call': {
        const message = getActiveAssistantMessage(event.requestId)
        if (!message) break
        const block: ToolBlock = { type: 'tool', call: event.payload }
        message.blocks.push(block)
        break
      }
      case 'tool-result': {
        const message = getActiveAssistantMessage(event.requestId)
        if (!message) break
        const block = [...message.blocks]
          .reverse()
          .find(
            (item) => item.type === 'tool' && item.call.toolCallId === event.payload.toolCallId
          ) as ToolBlock | undefined
        if (block) {
          block.result = event.payload.result
        }
        break
      }
      case 'error': {
        state.value.error = event.message
        break
      }
      case 'finish': {
        const message = getActiveAssistantMessage(event.requestId)
        if (message) {
          message.isStreaming = false
          message.status = event.finishReason === 'stop' ? 'final' : event.finishReason
          if (event.usage) {
            const block: MetaBlock = { type: 'meta', usage: event.usage }
            message.blocks.push(block)
          }
        }
        state.value.chat.activeRequestId = null
        break
      }
      default:
        break
    }
  }

  function getActiveAssistantMessage(requestId: string): ChatMessage | undefined {
    return state.value.chat.messages.find((item) => item.id === `assistant-${requestId}`)
  }

  return {
    state,
    activeSession,
    activeTool,
    activePrompt,
    activeResource,
    connectedSessions,
    initialize,
    savePreset,
    deletePreset,
    connectPreset,
    disconnect,
    setActiveSession,
    refreshWorkspaceData,
    runTool,
    renderPrompt,
    loadResource,
    toggleChatSession,
    clearChatMessages,
    sendChatMessage,
    abortChat,
    setChatModel,
    defaultStdioDraft: DEFAULT_STDIO_DRAFT
  }
})
