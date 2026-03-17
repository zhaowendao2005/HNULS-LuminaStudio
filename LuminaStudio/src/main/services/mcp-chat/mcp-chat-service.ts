import { randomUUID } from 'crypto'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { HumanMessage, SystemMessage, AIMessageChunk } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import {
  ChatOpenAI,
  ChatOpenAICompletions,
  ChatOpenAIResponses,
  type ClientOptions as OpenAIClientOptions
} from '@langchain/openai'
import { z } from 'zod'
import type {
  McpChatBootstrap,
  McpChatMessage,
  McpChatServerCatalogItem,
  McpChatSession,
  McpChatSettingsPayload,
  McpChatStreamEvent,
  McpChatToolCatalogItem,
  McpServerPreset
} from '@preload/types'
import type { ModelConfigService } from '../model-config'
import type { McpService } from '../mcp'
import type { UserSettingsService } from '../user-settings'

const PLANNER_SCHEMA = z.object({
  mode: z.enum(['tool', 'answer']),
  reason: z.string().optional(),
  calls: z
    .array(
      z.object({
        toolKey: z.string(),
        arguments: z.record(z.string(), z.unknown()).default({})
      })
    )
    .max(4)
    .default([])
})

type PlannerOutput = z.infer<typeof PLANNER_SCHEMA>

interface ConnectedServer {
  preset: McpServerPreset
  client: Client
  transport: Transport
  catalog: McpChatServerCatalogItem
}

interface ActiveRequest {
  sessionId: string
  controller: AbortController
}

interface AgentScratchpadEntry {
  round: number
  role: 'planner' | 'tool'
  text: string
}

type SupportedChatModel =
  | ChatOpenAI
  | ChatOpenAIResponses
  | ChatOpenAICompletions
  | ChatAnthropic
  | ChatGoogle
type StructuredChatModel = SupportedChatModel & {
  withStructuredOutput: (
    schema: typeof PLANNER_SCHEMA,
    config: { name: string; method: 'functionCalling' }
  ) => {
    invoke: (
      input: Array<SystemMessage | HumanMessage>,
      options?: { signal?: AbortSignal }
    ) => Promise<PlannerOutput>
  }
}

export class McpChatService {
  private readonly sessions = new Map<string, McpChatSession>()
  private readonly streamListeners = new Set<(event: McpChatStreamEvent) => void>()
  private readonly connectedServers = new Map<string, ConnectedServer>()
  private readonly activeRequests = new Map<string, ActiveRequest>()

  constructor(
    private readonly mcpService: McpService,
    private readonly modelConfigService: ModelConfigService,
    private readonly userSettingsService: UserSettingsService
  ) {}

  onStream(listener: (event: McpChatStreamEvent) => void): () => void {
    this.streamListeners.add(listener)
    return () => this.streamListeners.delete(listener)
  }

  async getBootstrap(): Promise<McpChatBootstrap> {
    const servers = await this.refreshServers()
    const settings = await this.userSettingsService.getSettings()
    return {
      sessions: Array.from(this.sessions.values()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
      servers,
      settings: {
        memoryRoundsDefault: settings.mcpChat.memoryRoundsDefault,
        enableAgentMode: settings.mcpChat.enableAgentMode,
        agentMaxRounds: settings.mcpChat.agentMaxRounds
      }
    }
  }

  async refreshServers(): Promise<McpChatServerCatalogItem[]> {
    const presets = await this.mcpService.listPresets()
    const catalogs: McpChatServerCatalogItem[] = []

    for (const preset of presets) {
      try {
        const connected = await this.getOrConnectServer(preset)
        const tools = await connected.client.listTools()
        const catalog: McpChatServerCatalogItem = {
          id: preset.id,
          name: preset.name,
          transport: preset.transport,
          status: 'connected',
          serverName: connected.client.getServerVersion()?.name ?? null,
          serverVersion: connected.client.getServerVersion()?.version ?? null,
          tools: (tools.tools ?? []).map((tool) => ({
            key: `${preset.id}::${tool.name}`,
            serverId: preset.id,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema as Record<string, unknown>,
            outputSchema: (tool as { outputSchema?: Record<string, unknown> }).outputSchema
          }))
        }
        connected.catalog = catalog
        catalogs.push(catalog)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        catalogs.push({
          id: preset.id,
          name: preset.name,
          transport: preset.transport,
          status: 'error',
          error: message,
          tools: []
        })
      }
    }

    return catalogs.sort((a, b) => a.name.localeCompare(b.name))
  }

  async createSession(payload: {
    title?: string
    providerId: string
    modelId: string
    memoryRounds?: number
  }): Promise<McpChatSession> {
    const settings = await this.userSettingsService.getSettings()
    const now = new Date().toISOString()
    const session: McpChatSession = {
      id: randomUUID(),
      title: payload.title?.trim() || 'MCP 对话',
      providerId: payload.providerId,
      modelId: payload.modelId,
      memoryRounds: Math.max(1, payload.memoryRounds ?? settings.mcpChat.memoryRoundsDefault),
      enabledServerIds: [],
      enabledToolKeys: [],
      messages: [],
      createdAt: now,
      updatedAt: now
    }
    this.sessions.set(session.id, session)
    this.emit({ type: 'session-snapshot', session })
    return session
  }

  async updateSession(sessionId: string, patch: Partial<McpChatSession>): Promise<McpChatSession> {
    const session = this.requireSession(sessionId)
    const next: McpChatSession = {
      ...session,
      title: patch.title?.trim() || session.title,
      providerId: patch.providerId || session.providerId,
      modelId: patch.modelId || session.modelId,
      memoryRounds: patch.memoryRounds ? Math.max(1, patch.memoryRounds) : session.memoryRounds,
      enabledServerIds: patch.enabledServerIds || session.enabledServerIds,
      enabledToolKeys: patch.enabledToolKeys || session.enabledToolKeys,
      updatedAt: new Date().toISOString()
    }
    this.sessions.set(sessionId, next)
    this.emit({ type: 'session-snapshot', session: next })
    return next
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async saveSettings(payload: McpChatSettingsPayload): Promise<McpChatSettingsPayload> {
    const settings = await this.userSettingsService.updateSettings({
      mcpChat: {
        memoryRoundsDefault: Math.max(1, payload.memoryRoundsDefault),
        enableAgentMode: Boolean(payload.enableAgentMode),
        agentMaxRounds: Math.max(1, payload.agentMaxRounds)
      }
    })
    return {
      memoryRoundsDefault: settings.mcpChat.memoryRoundsDefault,
      enableAgentMode: settings.mcpChat.enableAgentMode,
      agentMaxRounds: settings.mcpChat.agentMaxRounds
    }
  }

  async sendMessage(sessionId: string, input: string): Promise<{ requestId: string }> {
    const session = this.requireSession(sessionId)
    const trimmed = input.trim()
    if (!trimmed) {
      throw new Error('Message is empty')
    }

    const requestId = randomUUID()
    const controller = new AbortController()
    this.activeRequests.set(requestId, { sessionId, controller })

    const userMessage: McpChatMessage = {
      id: randomUUID(),
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString()
    }
    const nextSession = this.appendMessage(session, userMessage)
    this.emit({ type: 'session-snapshot', session: nextSession })

    void this.runConversation({
      requestId,
      sessionId,
      input: trimmed,
      signal: controller.signal
    }).finally(() => {
      this.activeRequests.delete(requestId)
    })

    return { requestId }
  }

  async abort(requestId: string): Promise<void> {
    const active = this.activeRequests.get(requestId)
    if (active) {
      active.controller.abort()
      this.activeRequests.delete(requestId)
    }
  }

  private async runConversation(params: {
    requestId: string
    sessionId: string
    input: string
    signal: AbortSignal
  }): Promise<void> {
    const { requestId, sessionId, input, signal } = params
    const session = this.requireSession(sessionId)

    try {
      const settings = await this.userSettingsService.getSettings()
      const agentEnabled = settings.mcpChat.enableAgentMode
      const maxAgentRounds = Math.max(1, settings.mcpChat.agentMaxRounds)
      const scratchpad: AgentScratchpadEntry[] = []

      const model = (await this.createChatModel(
        session.providerId,
        session.modelId
      )) as StructuredChatModel
      const enabledTools = await this.resolveEnabledTools(session)
      const planner = model.withStructuredOutput(PLANNER_SCHEMA, {
        name: 'mcp_chat_planner',
        method: 'functionCalling'
      })

      const toolOutputs: Array<{ tool: McpChatToolCatalogItem; result: unknown }> = []
      let finalPlan: PlannerOutput = {
        mode: 'answer',
        reason: '默认直接回答',
        calls: []
      }

      const totalRounds = agentEnabled ? maxAgentRounds : 1

      for (let round = 1; round <= totalRounds; round += 1) {
        this.emitStatus(
          requestId,
          sessionId,
          'planning',
          agentEnabled
            ? `第 ${round}/${totalRounds} 轮：正在分析是否继续调用 MCP 工具…`
            : '正在分析问题并规划是否需要调用 MCP 工具…'
        )

        const plannerMessages = this.buildPlannerMessages(session, input, enabledTools, scratchpad)
        const plan = (await planner.invoke(plannerMessages, { signal })) as PlannerOutput
        finalPlan = plan
        scratchpad.push({
          round,
          role: 'planner',
          text: `规划结果: mode=${plan.mode}; reason=${plan.reason || '无'}; calls=${JSON.stringify(plan.calls)}`
        })
        this.emitRawJson(requestId, sessionId, `planner-output:round-${round}`, plan)

        if (plan.mode !== 'tool' || enabledTools.length === 0 || plan.calls.length === 0) {
          break
        }

        this.emitStatus(
          requestId,
          sessionId,
          'tool-executing',
          agentEnabled
            ? `第 ${round}/${totalRounds} 轮：正在调用已启用的 MCP 工具…`
            : '正在调用已启用的 MCP 工具…'
        )
        for (const call of plan.calls) {
          const tool = enabledTools.find((item) => item.key === call.toolKey)
          if (!tool) continue
          const result = await this.callTool(tool, call.arguments, signal)
          toolOutputs.push({ tool, result })
          scratchpad.push({
            round,
            role: 'tool',
            text: `工具 ${tool.key} 返回: ${JSON.stringify(result)}`
          })
        }

        if (!agentEnabled) {
          break
        }
      }

      this.emitStatus(requestId, sessionId, 'answering', '正在基于工具结果生成最终回答…')
      const answerMessages = this.buildAnswerMessages(
        session,
        input,
        enabledTools,
        toolOutputs,
        finalPlan,
        scratchpad,
        agentEnabled ? totalRounds : 1
      )
      const stream = await model.stream(answerMessages, { signal })

      let assistantText = ''
      for await (const chunk of stream) {
        const delta = this.extractChunkText(chunk)
        if (!delta) continue
        assistantText += delta
        this.emit({
          type: 'assistant-chunk',
          requestId,
          sessionId,
          delta
        })
      }

      const assistantMessage: McpChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        text: assistantText || '模型未返回文本内容。',
        createdAt: new Date().toISOString()
      }
      const nextSession = this.appendMessage(this.requireSession(sessionId), assistantMessage)
      this.emit({ type: 'session-snapshot', session: nextSession })
      this.emitStatus(requestId, sessionId, 'done', '本轮回答已完成。')
      this.emit({
        type: 'finish',
        requestId,
        sessionId,
        messageId: assistantMessage.id
      })
    } catch (error) {
      const message =
        signal.aborted && error instanceof Error
          ? '对话已中止。'
          : error instanceof Error
            ? error.message
            : String(error)
      this.emit({
        type: 'error',
        requestId,
        sessionId,
        message
      })
    }
  }

  private buildPlannerMessages(
    session: McpChatSession,
    input: string,
    enabledTools: McpChatToolCatalogItem[],
    scratchpad: AgentScratchpadEntry[]
  ): Array<SystemMessage | HumanMessage> {
    const toolLines =
      enabledTools.length > 0
        ? enabledTools
            .map((tool) => {
              const schema = tool.inputSchema ? JSON.stringify(tool.inputSchema, null, 2) : '{}'
              return `- ${tool.key}\n  名称: ${tool.name}\n  描述: ${tool.description || '无描述'}\n  参数 Schema:\n${schema}`
            })
            .join('\n\n')
        : '当前没有启用任何 MCP 工具。'

    const historyText = this.buildHistoryText(session)
    const scratchpadText =
      scratchpad.length > 0
        ? scratchpad
            .map((entry) => `[round ${entry.round}][${entry.role}] ${entry.text}`)
            .join('\n')
        : ''
    return [
      new SystemMessage(
        [
          '你是 MCP 对话面板里的工具规划器。',
          '你的职责只有两件事：',
          '1. 判断这次问题是否必须调用 MCP 工具。',
          '2. 如果需要，输出最多 4 个工具调用计划。',
          '如果没有必要调用工具，也返回 mode=answer。',
          '工具 key 必须原样使用，不要编造。',
          '如果当前没有可用工具，必须返回 mode=answer。',
          '',
          '当前可用工具目录：',
          toolLines
        ].join('\n')
      ),
      new HumanMessage(
        [
          historyText ? `最近历史：\n${historyText}` : '',
          scratchpadText ? `本次请求中的临时 agent 历史：\n${scratchpadText}` : '',
          `用户新消息：${input}`
        ]
          .filter(Boolean)
          .join('\n\n')
      )
    ]
  }

  private buildAnswerMessages(
    session: McpChatSession,
    input: string,
    enabledTools: McpChatToolCatalogItem[],
    toolOutputs: Array<{ tool: McpChatToolCatalogItem; result: unknown }>,
    plan: PlannerOutput,
    scratchpad: AgentScratchpadEntry[],
    totalRounds: number
  ): Array<SystemMessage | HumanMessage> {
    const toolSummary =
      enabledTools.length > 0
        ? enabledTools.map((tool) => `- ${tool.key}: ${tool.description || '无描述'}`).join('\n')
        : '当前没有启用任何 MCP 工具。'
    const toolResultText =
      toolOutputs.length > 0
        ? toolOutputs
            .map(
              ({ tool, result }) =>
                `工具 ${tool.key} 返回结果：\n${JSON.stringify(result, null, 2)}`
            )
            .join('\n\n')
        : '本轮未执行工具。'

    const historyText = this.buildHistoryText(session)
    const scratchpadText =
      scratchpad.length > 0
        ? scratchpad
            .map((entry) => `[round ${entry.round}][${entry.role}] ${entry.text}`)
            .join('\n')
        : ''
    return [
      new SystemMessage(
        [
          '你是 MCP 对话面板里的回答助手。',
          '请基于聊天历史、当前问题，以及已经执行好的 MCP 工具结果来回答。',
          '如果工具结果不足够，必须明确指出不足，而不是编造。',
          '回答使用中文，保持直接、清晰。',
          `本轮运行模式：${totalRounds > 1 ? `多轮 agent 模式（最多 ${totalRounds} 轮）` : '单轮模式'}`,
          '',
          '当前已启用的工具目录：',
          toolSummary,
          '',
          `规划结论：${plan.reason || '无额外说明'}`
        ].join('\n')
      ),
      new HumanMessage(
        [
          historyText ? `最近历史：\n${historyText}` : '',
          scratchpadText ? `本次请求中的临时 agent 历史：\n${scratchpadText}` : '',
          `用户新消息：${input}`,
          `工具结果：\n${toolResultText}`
        ]
          .filter(Boolean)
          .join('\n\n')
      )
    ]
  }

  private buildHistoryText(session: McpChatSession): string {
    const recent = session.messages.slice(-Math.max(0, session.memoryRounds * 2))
    return recent.map((message) => `${message.role}: ${message.text}`).join('\n')
  }

  private async resolveEnabledTools(session: McpChatSession): Promise<McpChatToolCatalogItem[]> {
    const catalogs = await this.refreshServers()
    const serverIds = new Set(session.enabledServerIds)
    const toolKeys = new Set(session.enabledToolKeys)
    return catalogs
      .filter((server) => server.status === 'connected' && serverIds.has(server.id))
      .flatMap((server) => server.tools)
      .filter((tool) => toolKeys.has(tool.key))
  }

  private async callTool(
    tool: McpChatToolCatalogItem,
    args: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<unknown> {
    if (signal.aborted) {
      throw new Error('Request aborted')
    }
    const server = this.connectedServers.get(tool.serverId)
    if (!server) {
      throw new Error(`MCP server is not connected: ${tool.serverId}`)
    }
    this.emit({
      type: 'tool-call',
      requestId: this.findRequestIdBySignal(signal),
      sessionId: this.findSessionIdBySignal(signal),
      toolKey: tool.key,
      toolName: tool.name,
      serverId: tool.serverId,
      arguments: args
    })
    const result = await server.client.callTool({
      name: tool.name,
      arguments: args
    })
    const normalized = {
      content: Array.isArray(result.content) ? result.content : [],
      structuredContent: (result as { structuredContent?: unknown }).structuredContent,
      isError: typeof result.isError === 'boolean' ? result.isError : undefined
    }
    this.emitRawJson(
      this.findRequestIdBySignal(signal),
      this.findSessionIdBySignal(signal),
      `${tool.key}:result`,
      normalized
    )
    this.emit({
      type: 'tool-result',
      requestId: this.findRequestIdBySignal(signal),
      sessionId: this.findSessionIdBySignal(signal),
      toolKey: tool.key,
      toolName: tool.name,
      serverId: tool.serverId,
      result: normalized,
      isError: normalized.isError
    })
    return normalized
  }

  private extractChunkText(chunk: unknown): string {
    if (chunk instanceof AIMessageChunk) {
      if (typeof chunk.content === 'string') {
        return chunk.content
      }
      if (Array.isArray(chunk.content)) {
        return chunk.content
          .map((item) => {
            if (typeof item === 'string') return item
            if (
              typeof item === 'object' &&
              item &&
              'text' in item &&
              typeof item.text === 'string'
            ) {
              return item.text
            }
            return ''
          })
          .join('')
      }
    }

    if (typeof chunk === 'string') return chunk
    return ''
  }

  private appendMessage(session: McpChatSession, message: McpChatMessage): McpChatSession {
    const next: McpChatSession = {
      ...session,
      messages: [...session.messages, message],
      updatedAt: new Date().toISOString(),
      title:
        session.messages.length === 0 && message.role === 'user'
          ? message.text.slice(0, 24)
          : session.title
    }
    this.sessions.set(session.id, next)
    return next
  }

  private async createChatModel(providerId: string, modelId: string): Promise<SupportedChatModel> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((item) => item.id === providerId && item.enabled)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    if (provider.protocol === 'claude') {
      return new ChatAnthropic({
        model: modelId,
        apiKey: provider.apiKey,
        anthropicApiUrl: provider.baseUrl || undefined
      })
    }

    if (provider.protocol === 'gemini') {
      const geminiConfig = this.parseGeminiBaseUrl(provider.baseUrl)
      return new ChatGoogle({
        model: modelId,
        apiKey: provider.apiKey,
        endpoint: geminiConfig.endpoint,
        apiVersion: geminiConfig.apiVersion
      })
    }

    const configuration: OpenAIClientOptions | undefined = provider.baseUrl
      ? { baseURL: provider.baseUrl }
      : undefined

    if (provider.protocol === 'openai-response' || provider.protocol === 'openai') {
      return new ChatOpenAIResponses({
        model: modelId,
        apiKey: provider.apiKey,
        configuration
      })
    }

    if (provider.protocol === 'openai-completion') {
      return new ChatOpenAICompletions({
        model: modelId,
        apiKey: provider.apiKey,
        configuration
      })
    }

    return new ChatOpenAI({
      model: modelId,
      apiKey: provider.apiKey,
      configuration
    })
  }

  private parseGeminiBaseUrl(baseUrl: string): { endpoint?: string; apiVersion?: string } {
    if (!baseUrl) return {}
    try {
      const url = new URL(baseUrl)
      const parts = url.pathname.split('/').filter(Boolean)
      const apiVersion = parts[0]
      return {
        endpoint: url.host,
        apiVersion
      }
    } catch {
      return {}
    }
  }

  private async getOrConnectServer(preset: McpServerPreset): Promise<ConnectedServer> {
    const cached = this.connectedServers.get(preset.id)
    if (cached) {
      return cached
    }

    const transport = this.createTransport(preset)
    const client = new Client(
      { name: 'LuminaStudio MCP Chat', version: '1.0.0' },
      {
        capabilities: {
          sampling: {},
          roots: { listChanged: false }
        }
      }
    )
    await client.connect(transport)
    const connected: ConnectedServer = {
      preset,
      client,
      transport,
      catalog: {
        id: preset.id,
        name: preset.name,
        transport: preset.transport,
        status: 'connected',
        tools: []
      }
    }
    this.connectedServers.set(preset.id, connected)
    return connected
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

  private requireSession(sessionId: string): McpChatSession {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    return session
  }

  private findRequestIdBySignal(signal: AbortSignal): string {
    const entry = Array.from(this.activeRequests.entries()).find(
      ([, item]) => item.controller.signal === signal
    )
    return entry?.[0] || 'unknown-request'
  }

  private findSessionIdBySignal(signal: AbortSignal): string {
    const entry = Array.from(this.activeRequests.values()).find(
      (item) => item.controller.signal === signal
    )
    return entry?.sessionId || 'unknown-session'
  }

  private emit(event: McpChatStreamEvent): void {
    this.streamListeners.forEach((listener) => listener(event))
  }

  private emitStatus(
    requestId: string,
    sessionId: string,
    phase: 'planning' | 'tool-executing' | 'answering' | 'done',
    message: string
  ): void {
    this.emit({ type: 'status', requestId, sessionId, phase, message })
  }

  private emitRawJson(requestId: string, sessionId: string, label: string, payload: unknown): void {
    this.emit({ type: 'raw-json', requestId, sessionId, label, payload })
  }
}
