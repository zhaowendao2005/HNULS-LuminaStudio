import type {
  McpPromptRenderResult,
  McpPromptSummary,
  McpResourceReadResult,
  McpResourceSummary,
  McpServerPreset,
  McpSessionState,
  McpToolCallResult,
  McpToolSummary,
  McpTraceEvent
} from '@preload/types'

export type McpInspectorMode = 'visual' | 'raw'
export type McpStage = 'connect' | 'tools' | 'prompts' | 'resources' | 'execute'

export interface McpPresetDraftStdio {
  id: string
  name: string
  transport: 'stdio'
  command: string
  argsText: string
  cwd: string
  envText: string
}

export interface McpPresetDraftHttp {
  id: string
  name: string
  transport: 'streamable-http'
  url: string
  headersText: string
}

export type McpPresetDraft = McpPresetDraftStdio | McpPresetDraftHttp

export interface McpWorkbenchState {
  presets: McpServerPreset[]
  session: McpSessionState
  tools: McpToolSummary[]
  prompts: McpPromptSummary[]
  resources: McpResourceSummary[]
  traces: McpTraceEvent[]
  selectedToolName: string | null
  selectedPromptName: string | null
  selectedResourceUri: string | null
  toolResult: McpToolCallResult | null
  promptResult: McpPromptRenderResult | null
  resourceResult: McpResourceReadResult | null
  activeStage: McpStage
  toolsMode: McpInspectorMode
  promptsMode: McpInspectorMode
  resourcesMode: McpInspectorMode
  rawTraceOpen: boolean
  loading: boolean
  error: string | null
}
