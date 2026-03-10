import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import type {
  McpCapabilitiesSummary,
  McpPromptRenderResult,
  McpPromptSummary,
  McpResourceReadResult,
  McpResourceSummary,
  McpServerPreset,
  McpSessionEvent,
  McpSessionState,
  McpToolCallResult,
  McpToolSummary,
  McpTraceEvent
} from '@preload/types'
import { logger } from '../logger'

const log = logger.scope('McpService')
const TRACE_LIMIT = 200

interface McpPersistedConfig {
  version: number
  updatedAt: string
  presets: McpServerPreset[]
}

const DEFAULT_CONFIG: McpPersistedConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  presets: []
}

class TracedTransport implements Transport {
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor(
    private readonly transport: Transport,
    private readonly recordTrace: (direction: 'outgoing' | 'incoming', payload: unknown) => void
  ) {
    this.transport.onclose = () => this.onclose?.()
    this.transport.onerror = (error) => this.onerror?.(error)
    this.transport.onmessage = (message) => {
      this.recordTrace('incoming', message)
      this.onmessage?.(message)
    }
  }

  async start(): Promise<void> {
    await this.transport.start()
  }

  async close(): Promise<void> {
    await this.transport.close()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.recordTrace('outgoing', message)
    await this.transport.send(message)
  }
}

export class McpService {
  private readonly configPath: string
  private config: McpPersistedConfig = DEFAULT_CONFIG
  private client: Client | null = null
  private transport: Transport | null = null
  private sessionState: McpSessionState = this.createEmptySessionState()
  private readonly sessionListeners = new Set<(event: McpSessionEvent) => void>()
  private readonly traceListeners = new Set<(event: McpTraceEvent) => void>()
  private readonly traceBuffer: McpTraceEvent[] = []

  constructor() {
    const userDataPath = app.getPath('userData')
    const dataDir = path.join(userDataPath, 'databases')
    this.configPath = path.join(dataDir, 'mcp.json')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    this.loadConfig()
  }

  onSessionEvent(listener: (event: McpSessionEvent) => void): () => void {
    this.sessionListeners.add(listener)
    return () => this.sessionListeners.delete(listener)
  }

  onTrace(listener: (event: McpTraceEvent) => void): () => void {
    this.traceListeners.add(listener)
    return () => this.traceListeners.delete(listener)
  }

  async listPresets(): Promise<McpServerPreset[]> {
    return this.config.presets
  }

  async savePreset(preset: McpServerPreset): Promise<McpServerPreset[]> {
    const sanitized = this.normalizePreset(preset)
    const next = this.config.presets.filter((item) => item.id !== sanitized.id)
    next.push(sanitized)
    this.config.presets = next.sort((a, b) => a.name.localeCompare(b.name))
    this.saveConfig()
    return this.config.presets
  }

  async deletePreset(presetId: string): Promise<McpServerPreset[]> {
    if (this.sessionState.presetId === presetId) {
      await this.disconnect()
    }
    this.config.presets = this.config.presets.filter((item) => item.id !== presetId)
    this.saveConfig()
    return this.config.presets
  }

  async connect(presetId: string): Promise<McpSessionState> {
    const preset = this.config.presets.find((item) => item.id === presetId)
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`)
    }

    await this.disconnect()
    this.clearTraceBuffer()

    const transport = this.createTransport(preset)
    const tracedTransport = new TracedTransport(transport, (direction, payload) => {
      this.recordTrace(direction, preset.transport, payload)
    })
    const client = new Client(
      { name: 'LuminaStudio MCP Workbench', version: '1.0.0' },
      {
        capabilities: {
          elicitation: {},
          roots: { listChanged: false },
          sampling: {}
        }
      }
    )

    tracedTransport.onerror = (error) => {
      log.error('MCP transport error', error)
      this.updateSessionState({ connected: false, error: error.message })
    }
    tracedTransport.onclose = () => {
      this.updateSessionState({ connected: false })
    }

    await client.connect(tracedTransport)

    this.client = client
    this.transport = tracedTransport
    this.updateSessionState({
      connected: true,
      presetId: preset.id,
      transport: preset.transport,
      serverName: client.getServerVersion()?.name ?? null,
      serverVersion: client.getServerVersion()?.version ?? null,
      protocolVersion: null,
      capabilities: this.mapCapabilities(client.getServerCapabilities()),
      instructions: client.getInstructions(),
      error: undefined
    })

    return this.sessionState
  }

  async disconnect(): Promise<McpSessionState> {
    if (this.transport) {
      try {
        await this.transport.close()
      } catch (error) {
        log.warn('MCP transport close failed', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    this.transport = null
    this.client = null
    this.updateSessionState(this.createEmptySessionState())
    this.clearTraceBuffer()
    return this.sessionState
  }

  async getSessionState(): Promise<McpSessionState> {
    return this.sessionState
  }

  async listTools(): Promise<McpToolSummary[]> {
    const client = this.requireClient()
    const result = await client.listTools()
    return (result.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
      outputSchema: (tool as { outputSchema?: Record<string, unknown> }).outputSchema
    }))
  }

  async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolCallResult> {
    const client = this.requireClient()
    const result = await client.callTool({ name, arguments: args })
    return {
      content: Array.isArray(result.content) ? result.content : [],
      structuredContent: (result as { structuredContent?: unknown }).structuredContent,
      isError: typeof result.isError === 'boolean' ? result.isError : undefined
    }
  }

  async listPrompts(): Promise<McpPromptSummary[]> {
    const client = this.requireClient()
    const result = await client.listPrompts()
    return (result.prompts ?? []).map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments?.map((item) => ({
        name: item.name,
        description: item.description,
        required: item.required
      }))
    }))
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<McpPromptRenderResult> {
    const client = this.requireClient()
    const result = await client.getPrompt({ name, arguments: args })
    return {
      description: result.description,
      messages: result.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    }
  }

  async listResources(): Promise<McpResourceSummary[]> {
    const client = this.requireClient()
    const result = await client.listResources()
    return (result.resources ?? []).map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }))
  }

  async readResource(uri: string): Promise<McpResourceReadResult> {
    const client = this.requireClient()
    const result = await client.readResource({ uri })
    return {
      contents: result.contents.map((content) => ({
        uri: content.uri,
        mimeType: content.mimeType,
        text: 'text' in content ? content.text : undefined,
        blob: 'blob' in content ? content.blob : undefined
      }))
    }
  }

  private loadConfig(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig()
        return
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      this.config = {
        ...DEFAULT_CONFIG,
        ...(JSON.parse(raw) as Partial<McpPersistedConfig>)
      }
      this.config.presets = (this.config.presets ?? []).map((preset) =>
        this.normalizePreset(preset)
      )
    } catch (error) {
      log.error('Failed to load MCP config', error)
      this.config = DEFAULT_CONFIG
      this.saveConfig()
    }
  }

  private saveConfig(): void {
    this.config.updatedAt = new Date().toISOString()
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
  }

  private normalizePreset(preset: McpServerPreset): McpServerPreset {
    if (preset.transport === 'stdio') {
      return {
        id: preset.id || randomUUID(),
        name: preset.name.trim(),
        transport: 'stdio',
        command: preset.command.trim(),
        args: preset.args ?? [],
        cwd: preset.cwd?.trim() || undefined,
        env: preset.env ?? {}
      }
    }

    return {
      id: preset.id || randomUUID(),
      name: preset.name.trim(),
      transport: 'streamable-http',
      url: preset.url.trim(),
      headers: preset.headers ?? {}
    }
  }

  private createTransport(preset: McpServerPreset): Transport {
    if (preset.transport === 'stdio') {
      return new StdioClientTransport({
        command: preset.command,
        args: preset.args,
        cwd: preset.cwd,
        env: preset.env
      })
    }

    return new StreamableHTTPClientTransport(new URL(preset.url), {
      requestInit: {
        headers: preset.headers
      }
    })
  }

  private createEmptySessionState(): McpSessionState {
    return {
      connected: false,
      presetId: null,
      transport: null,
      serverName: null,
      serverVersion: null,
      protocolVersion: null,
      capabilities: null
    }
  }

  private mapCapabilities(
    capabilities: ReturnType<Client['getServerCapabilities']>
  ): McpCapabilitiesSummary {
    return {
      tools: Boolean(capabilities?.tools),
      prompts: Boolean(capabilities?.prompts),
      resources: Boolean(capabilities?.resources),
      logging: Boolean(capabilities?.logging)
    }
  }

  private updateSessionState(patch: Partial<McpSessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...patch
    }
    const event: McpSessionEvent = { type: 'session-state', state: this.sessionState }
    this.sessionListeners.forEach((listener) => listener(event))
  }

  private recordTrace(
    direction: 'outgoing' | 'incoming',
    transport: McpSessionState['transport'],
    payload: unknown
  ): void {
    const event: McpTraceEvent = {
      id: randomUUID(),
      direction,
      timestamp: new Date().toISOString(),
      transport,
      payload
    }
    this.traceBuffer.push(event)
    if (this.traceBuffer.length > TRACE_LIMIT) {
      this.traceBuffer.shift()
    }
    this.traceListeners.forEach((listener) => listener(event))
  }

  private clearTraceBuffer(): void {
    this.traceBuffer.length = 0
  }

  private requireClient(): Client {
    if (!this.client) {
      throw new Error('MCP session is not connected')
    }
    return this.client
  }
}
