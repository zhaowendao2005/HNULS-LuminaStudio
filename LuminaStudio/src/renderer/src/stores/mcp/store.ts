import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { McpServerPreset } from '@preload/types'
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
    session: {
      connected: false,
      presetId: null,
      transport: null,
      serverName: null,
      serverVersion: null,
      protocolVersion: null,
      capabilities: null
    },
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

  async function initialize(): Promise<void> {
    state.value.loading = true
    try {
      const [presets, session] = await Promise.all([
        McpDataSource.listPresets(),
        McpDataSource.getSessionState()
      ])
      state.value.presets = presets
      state.value.session = session
      ensureSubscriptions()
      if (session.connected) {
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
        state.value.session = session
      })
    }
    if (!disposeTraceEvent) {
      disposeTraceEvent = McpDataSource.onTrace((event) => {
        state.value.traces = [...state.value.traces.slice(-199), event]
      })
    }
  }

  async function savePreset(preset: McpServerPreset): Promise<void> {
    state.value.presets = await McpDataSource.savePreset(preset)
  }

  async function deletePreset(presetId: string): Promise<void> {
    state.value.presets = await McpDataSource.deletePreset(presetId)
  }

  async function connectPreset(presetId: string): Promise<void> {
    state.value.loading = true
    state.value.error = null
    try {
      state.value.session = await McpDataSource.connect(presetId)
      state.value.activeStage = 'tools'
      state.value.traces = []
      await refreshWorkspaceData()
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function disconnect(): Promise<void> {
    state.value.session = await McpDataSource.disconnect()
    state.value.tools = []
    state.value.prompts = []
    state.value.resources = []
    state.value.toolResult = null
    state.value.promptResult = null
    state.value.resourceResult = null
    state.value.traces = []
    state.value.selectedToolName = null
    state.value.selectedPromptName = null
    state.value.selectedResourceUri = null
    state.value.activeStage = 'connect'
  }

  async function refreshWorkspaceData(): Promise<void> {
    const [tools, prompts, resources] = await Promise.all([
      McpDataSource.listTools(),
      McpDataSource.listPrompts(),
      McpDataSource.listResources()
    ])
    state.value.tools = tools
    state.value.prompts = prompts
    state.value.resources = resources
    state.value.selectedToolName = tools[0]?.name ?? null
    state.value.selectedPromptName = prompts[0]?.name ?? null
    state.value.selectedResourceUri = resources[0]?.uri ?? null
  }

  async function runTool(args?: Record<string, unknown>): Promise<void> {
    if (!state.value.selectedToolName) return
    state.value.toolResult = await McpDataSource.callTool(state.value.selectedToolName, args)
  }

  async function renderPrompt(args?: Record<string, string>): Promise<void> {
    if (!state.value.selectedPromptName) return
    state.value.promptResult = await McpDataSource.getPrompt(state.value.selectedPromptName, args)
  }

  async function loadResource(): Promise<void> {
    if (!state.value.selectedResourceUri) return
    state.value.resourceResult = await McpDataSource.readResource(state.value.selectedResourceUri)
  }

  return {
    state,
    activeTool,
    activePrompt,
    activeResource,
    initialize,
    savePreset,
    deletePreset,
    connectPreset,
    disconnect,
    refreshWorkspaceData,
    runTool,
    renderPrompt,
    loadResource,
    defaultStdioDraft: DEFAULT_STDIO_DRAFT
  }
})
