import { randomUUID } from 'crypto'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { dynamicTool, extractReasoningMiddleware, streamText, wrapLanguageModel } from 'ai'
import type { LanguageModel } from 'ai'
import type { WebContents } from 'electron'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import type {
  AiChatStreamEvent,
  McpCapabilitiesSummary,
  McpChatMessage,
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
import type { LangchainClientToolCallPayload } from '@shared/langchain-client.types'
import type { ModelConfigService } from '../model-config'
import { logger } from '../logger'

const log = logger.scope('McpService')
const TRACE_LIMIT = 200

interface SessionRecord {
  preset: McpServerPreset
  client: Client
  transport: Transport
  state: McpSessionState
  traces: McpTraceEvent[]
}

interface ChatRecord {
  sender: WebContents
  requestId: string
  abortController: AbortController
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
  private readonly sessions = new Map<string, SessionRecord>()
  private activeSessionId: string | null = null
  private readonly sessionListeners = new Set<(event: McpSessionEvent) => void>()
  private readonly traceListeners = new Set<(event: McpTraceEvent) => void>()
  private readonly chatRequests = new Map<string, ChatRecord>()

  constructor(private readonly modelConfigService: ModelConfigService) {}

  onSessionEvent(listener: (event: McpSessionEvent) => void): () => void {
    this.sessionListeners.add(listener)
    return () => this.sessionListeners.delete(listener)
  }

  onTrace(listener: (event: McpTraceEvent) => void): () => void {
    this.traceListeners.add(listener)
    return () => this.traceListeners.delete(listener)
  }

  async listPresets(): Promise<McpServerPreset[]> {
    return []
  }

  async savePreset(_preset: McpServerPreset): Promise<McpServerPreset[]> {
    return []
  }

  async deletePreset(_presetId: string): Promise<McpServerPreset[]> {
    return []
  }

  async connect(preset: McpServerPreset): Promise<McpSessionState> {
    const normalizedPreset = this.normalizePreset(preset)
    const sessionId = randomUUID()
    const transport = this.createTransport(normalizedPreset)
    const tracedTransport = new TracedTransport(transport, (direction, payload) => {
      this.recordTrace(sessionId, direction, normalizedPreset.transport, payload)
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

    const baseState: McpSessionState = {
      sessionId,
      connected: false,
      presetId: normalizedPreset.id,
      presetName: normalizedPreset.name,
      transport: normalizedPreset.transport,
      serverName: null,
      serverVersion: null,
      protocolVersion: null,
      capabilities: null
    }

    tracedTransport.onerror = (error) => {
      log.error('MCP transport error', error, { sessionId })
      this.updateSessionState(sessionId, { connected: false, error: error.message })
    }
    tracedTransport.onclose = () => {
      this.updateSessionState(sessionId, { connected: false })
    }

    this.sessions.set(sessionId, {
      preset: normalizedPreset,
      client,
      transport: tracedTransport,
      state: baseState,
      traces: []
    })

    await client.connect(tracedTransport)

    const state = this.updateSessionState(sessionId, {
      connected: true,
      serverName: client.getServerVersion()?.name ?? null,
      serverVersion: client.getServerVersion()?.version ?? null,
      protocolVersion: null,
      capabilities: this.mapCapabilities(client.getServerCapabilities()),
      instructions: client.getInstructions(),
      error: undefined
    })
    this.activeSessionId = sessionId
    return state
  }

  async disconnect(sessionId?: string): Promise<McpSessionState | null> {
    const targetId = sessionId ?? this.activeSessionId
    if (!targetId) {
      return null
    }
    const record = this.sessions.get(targetId)
    if (!record) {
      return null
    }
    try {
      await record.transport.close()
    } catch (error) {
      log.warn('MCP transport close failed', {
        sessionId: targetId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    this.sessions.delete(targetId)
    if (this.activeSessionId === targetId) {
      this.activeSessionId = this.sessions.keys().next().value ?? null
    }
    const state = { ...record.state, connected: false }
    this.emitSessionEvent(state)
    return state
  }

  async getSessionState(sessionId?: string): Promise<McpSessionState | null> {
    const targetId = sessionId ?? this.activeSessionId
    if (!targetId) return null
    return this.sessions.get(targetId)?.state ?? null
  }

  async listSessionStates(): Promise<McpSessionState[]> {
    return Array.from(this.sessions.values()).map((item) => item.state)
  }

  async listTools(sessionId: string): Promise<McpToolSummary[]> {
    const record = this.requireSession(sessionId)
    const result = await record.client.listTools()
    return (result.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
      outputSchema: (tool as { outputSchema?: Record<string, unknown> }).outputSchema
    }))
  }

  async callTool(
    sessionId: string,
    name: string,
    args?: Record<string, unknown>
  ): Promise<McpToolCallResult> {
    const record = this.requireSession(sessionId)
    const result = await record.client.callTool({ name, arguments: args })
    return {
      content: Array.isArray(result.content) ? result.content : [],
      structuredContent: (result as { structuredContent?: unknown }).structuredContent,
      isError: typeof result.isError === 'boolean' ? result.isError : undefined
    }
  }

  async listPrompts(sessionId: string): Promise<McpPromptSummary[]> {
    const record = this.requireSession(sessionId)
    const result = await this.safeOptionalRequest(
      () => record.client.listPrompts(),
      record.state.capabilities?.prompts ?? false,
      'prompts/list'
    )
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

  async getPrompt(
    sessionId: string,
    name: string,
    args?: Record<string, string>
  ): Promise<McpPromptRenderResult> {
    const record = this.requireSession(sessionId)
    const result = await record.client.getPrompt({ name, arguments: args })
    return {
      description: result.description,
      messages: result.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    }
  }

  async listResources(sessionId: string): Promise<McpResourceSummary[]> {
    const record = this.requireSession(sessionId)
    const result = await this.safeOptionalRequest(
      () => record.client.listResources(),
      record.state.capabilities?.resources ?? false,
      'resources/list'
    )
    return (result.resources ?? []).map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }))
  }

  async readResource(sessionId: string, uri: string): Promise<McpResourceReadResult> {
    const record = this.requireSession(sessionId)
    const result = await record.client.readResource({ uri })
    return {
      contents: result.contents.map((content) => ({
        uri: content.uri,
        mimeType: content.mimeType,
        text: 'text' in content ? content.text : undefined,
        blob: 'blob' in content ? content.blob : undefined
      }))
    }
  }

  async startChat(
    sender: WebContents,
    payload: {
      requestId?: string
      providerId: string
      modelId: string
      enableThinking?: boolean
      mcpEnabled: boolean
      sessionIds: string[]
      messages: McpChatMessage[]
    }
  ): Promise<{ requestId: string }> {
    const requestId = payload.requestId ?? randomUUID()
    const model = await this.buildModel(
      payload.providerId,
      payload.modelId,
      payload.enableThinking ?? false
    )
    const abortController = new AbortController()
    this.chatRequests.set(requestId, { sender, requestId, abortController })

    this.sendChatEvent(sender, {
      type: 'stream-start',
      requestId,
      conversationId: requestId,
      providerId: payload.providerId,
      modelId: payload.modelId,
      startedAt: new Date().toISOString()
    })

    const tools = payload.mcpEnabled
      ? await this.buildChatTools(sender, requestId, payload.sessionIds)
      : undefined

    this.runChatStream(sender, requestId, model, payload.messages, abortController, tools).catch(
      (error) => {
        log.error('MCP chat stream failed', error, { requestId })
        this.sendChatEvent(sender, {
          type: 'error',
          requestId,
          message: error instanceof Error ? error.message : String(error)
        })
        this.sendChatEvent(sender, {
          type: 'finish',
          requestId,
          finishReason: 'error'
        })
        this.chatRequests.delete(requestId)
      }
    )

    return { requestId }
  }

  async abortChat(requestId: string): Promise<void> {
    const record = this.chatRequests.get(requestId)
    if (!record) return
    record.abortController.abort()
  }

  private async runChatStream(
    sender: WebContents,
    requestId: string,
    model: LanguageModel,
    messages: McpChatMessage[],
    abortController: AbortController,
    tools?: Record<string, ReturnType<typeof dynamicTool>>
  ): Promise<void> {
    try {
      const result = streamText({
        model,
        messages,
        abortSignal: abortController.signal,
        tools
      })

      for await (const part of result.fullStream as AsyncIterable<Record<string, unknown>>) {
        switch (part.type) {
          case 'text-delta': {
            this.sendChatEvent(sender, {
              type: 'text-delta',
              requestId,
              delta: this.extractDelta(part)
            })
            break
          }
          case 'reasoning-start': {
            this.sendChatEvent(sender, {
              type: 'reasoning-start',
              requestId,
              id: part.id ?? 'reasoning-block'
            })
            break
          }
          case 'reasoning-delta': {
            this.sendChatEvent(sender, {
              type: 'reasoning-delta',
              requestId,
              id: part.id ?? 'reasoning-block',
              delta: this.extractDelta(part)
            })
            break
          }
          case 'reasoning-end': {
            this.sendChatEvent(sender, {
              type: 'reasoning-end',
              requestId,
              id: part.id ?? 'reasoning-block'
            })
            break
          }
          case 'tool-call': {
            const payload: LangchainClientToolCallPayload = {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolArgs: part.input
            }
            this.sendChatEvent(sender, {
              type: 'tool-call',
              requestId,
              payload
            })
            break
          }
          case 'tool-result': {
            this.sendChatEvent(sender, {
              type: 'tool-result',
              requestId,
              payload: {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                result: this.normalizeToolOutput(part.output)
              }
            })
            break
          }
          case 'error': {
            this.sendChatEvent(sender, {
              type: 'error',
              requestId,
              message: part.error?.message ?? 'Unknown error'
            })
            break
          }
          default:
            break
        }
      }

      const usage = (await result.usage) as {
        promptTokens?: number
        inputTokens?: number
        completionTokens?: number
        outputTokens?: number
        totalTokens?: number
      }
      const finishReason = await result.finishReason
      this.sendChatEvent(sender, {
        type: 'finish',
        requestId,
        finishReason: finishReason === 'stop' ? 'stop' : 'error',
        usage: usage
          ? {
              inputTokens: usage.promptTokens ?? usage.inputTokens ?? 0,
              outputTokens: usage.completionTokens ?? usage.outputTokens ?? 0,
              totalTokens: usage.totalTokens ?? 0
            }
          : undefined
      })
    } catch (error) {
      const err = error as { name?: string; message?: string; stack?: string }
      if (err.name === 'AbortError') {
        this.sendChatEvent(sender, {
          type: 'finish',
          requestId,
          finishReason: 'aborted'
        })
      } else {
        this.sendChatEvent(sender, {
          type: 'error',
          requestId,
          message: err.message ?? 'Unknown error',
          stack: err.stack
        })
        this.sendChatEvent(sender, {
          type: 'finish',
          requestId,
          finishReason: 'error'
        })
      }
    } finally {
      this.chatRequests.delete(requestId)
    }
  }

  private async buildChatTools(
    sender: WebContents,
    requestId: string,
    sessionIds: string[]
  ): Promise<Record<string, ReturnType<typeof dynamicTool>>> {
    const entries = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const record = this.requireSession(sessionId)
        const tools = await this.listTools(sessionId)
        return tools.map((tool) => {
          const prefixedName = `${this.slug(record.state.presetName || sessionId)}__${tool.name}`
          return [
            prefixedName,
            dynamicTool({
              description:
                tool.description || `${record.state.presetName || sessionId} / ${tool.name}`,
              inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
              execute: async (input) => {
                const payload: LangchainClientToolCallPayload = {
                  toolCallId: randomUUID(),
                  toolName: prefixedName,
                  toolArgs: input
                }
                this.sendChatEvent(sender, {
                  type: 'tool-call',
                  requestId,
                  payload
                })
                const result = await this.callTool(
                  sessionId,
                  tool.name,
                  input as Record<string, unknown>
                )
                const normalized = {
                  content: result.content,
                  structuredContent: result.structuredContent,
                  isError: result.isError,
                  sessionId,
                  sessionName: record.state.presetName,
                  originalToolName: tool.name
                }
                this.sendChatEvent(sender, {
                  type: 'tool-result',
                  requestId,
                  payload: {
                    toolCallId: payload.toolCallId,
                    toolName: prefixedName,
                    result: normalized
                  }
                })
                return normalized
              }
            })
          ] as const
        })
      })
    )

    return Object.fromEntries(entries.flat())
  }

  private async buildModel(
    providerId: string,
    modelId: string,
    enableThinking: boolean
  ): Promise<LanguageModel> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((item) => item.id === providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }
    const baseURL = this.normalizeBaseURL(provider.baseUrl)
    const providerInstance = createOpenAICompatible({
      name: providerId,
      baseURL,
      apiKey: provider.apiKey,
      headers: provider.defaultHeaders,
      includeUsage: true
    })
    let model = providerInstance.chatModel(modelId)
    if (enableThinking) {
      model = wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: 'think', startWithReasoning: true })
      })
    }
    return model
  }

  private normalizeBaseURL(baseUrl: string): string {
    const url = baseUrl.trim().replace(/\/$/, '')
    return url.endsWith('/v1') ? url : `${url}/v1`
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

  private updateSessionState(sessionId: string, patch: Partial<McpSessionState>): McpSessionState {
    const record = this.requireSession(sessionId)
    record.state = {
      ...record.state,
      ...patch,
      sessionId
    }
    this.emitSessionEvent(record.state)
    return record.state
  }

  private emitSessionEvent(state: McpSessionState): void {
    const event: McpSessionEvent = { type: 'session-state', state }
    this.sessionListeners.forEach((listener) => listener(event))
  }

  private recordTrace(
    sessionId: string,
    direction: 'outgoing' | 'incoming',
    transport: McpSessionState['transport'],
    payload: unknown
  ): void {
    const record = this.sessions.get(sessionId)
    if (!record) return
    const event: McpTraceEvent = {
      id: randomUUID(),
      sessionId,
      direction,
      timestamp: new Date().toISOString(),
      transport,
      payload
    }
    record.traces.push(event)
    if (record.traces.length > TRACE_LIMIT) {
      record.traces.shift()
    }
    this.traceListeners.forEach((listener) => listener(event))
  }

  private requireSession(sessionId?: string): SessionRecord {
    const targetId = sessionId ?? this.activeSessionId
    if (!targetId) {
      throw new Error('MCP session is not connected')
    }
    const record = this.sessions.get(targetId)
    if (!record) {
      throw new Error(`MCP session not found: ${targetId}`)
    }
    return record
  }

  private async safeOptionalRequest<TResult extends { prompts?: unknown[]; resources?: unknown[] }>(
    request: () => Promise<TResult>,
    capabilityEnabled: boolean,
    methodName: 'prompts/list' | 'resources/list'
  ): Promise<TResult> {
    if (!capabilityEnabled) {
      return this.createEmptyOptionalResult(methodName) as TResult
    }

    try {
      return await request()
    } catch (error) {
      if (this.isMethodNotFoundError(error)) {
        log.warn(`MCP server advertised unsupported optional method: ${methodName}`, {
          error: error instanceof Error ? error.message : String(error)
        })
        return this.createEmptyOptionalResult(methodName) as TResult
      }
      throw error
    }
  }

  private createEmptyOptionalResult(methodName: 'prompts/list' | 'resources/list'): {
    prompts?: []
    resources?: []
  } {
    if (methodName === 'prompts/list') {
      return { prompts: [] }
    }
    return { resources: [] }
  }

  private isMethodNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const candidate = error as { code?: unknown }
    return candidate.code === -32601
  }

  private sendChatEvent(sender: WebContents, event: AiChatStreamEvent): void {
    sender.send('mcp:chat-stream', event)
  }

  private extractDelta(part: { delta?: string; text?: string; textDelta?: string }): string {
    return part.delta ?? part.text ?? part.textDelta ?? ''
  }

  private normalizeToolOutput(output: unknown): unknown {
    if (
      output &&
      typeof output === 'object' &&
      'type' in output &&
      (output as { type?: string }).type === 'text' &&
      'value' in output
    ) {
      return (output as { value: unknown }).value
    }
    return output
  }

  private slug(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'mcp'
    )
  }
}
