import type {
  McpCallToolRequest,
  McpChatAbortRequest,
  McpChatStartRequest,
  McpConnectRequest,
  McpDisconnectRequest,
  McpGetPromptRequest,
  McpReadResourceRequest,
  McpSessionScopedRequest
} from '@preload/types'
import type { IpcMainInvokeEvent } from 'electron'
import { BaseIPCHandler } from './base-handler'
import type { McpService } from '../services/mcp'

export class McpIPCHandler extends BaseIPCHandler {
  constructor(private readonly mcpService: McpService) {
    super()
    this.register()

    this.mcpService.onSessionEvent((event) => {
      this.broadcastToAll('mcp:session-event', event)
    })
    this.mcpService.onTrace((event) => {
      this.broadcastToAll('mcp:trace', event)
    })
  }

  protected getChannelPrefix(): string {
    return 'mcp'
  }

  async handleListPresets(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.listPresets() }
  }

  async handleSavePreset(
    _event: unknown,
    preset: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!preset || typeof preset !== 'object') {
      return { success: false, error: 'Invalid preset' }
    }
    return { success: true, data: await this.mcpService.savePreset(preset as never) }
  }

  async handleDeletePreset(
    _event: unknown,
    presetId: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (typeof presetId !== 'string') {
      return { success: false, error: 'Invalid presetId' }
    }
    return { success: true, data: await this.mcpService.deletePreset(presetId) }
  }

  async handleConnect(
    _event: unknown,
    request: McpConnectRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.preset || typeof request.preset !== 'object') {
      return { success: false, error: 'Missing preset' }
    }
    return { success: true, data: await this.mcpService.connect(request.preset) }
  }

  async handleDisconnect(
    _event: unknown,
    request?: McpDisconnectRequest
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.disconnect(request?.sessionId) }
  }

  async handleGetSessionState(
    _event: unknown,
    request?: McpDisconnectRequest
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.getSessionState(request?.sessionId) }
  }

  async handleListSessionStates(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.listSessionStates() }
  }

  async handleListTools(
    _event: unknown,
    request: McpSessionScopedRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return { success: true, data: await this.mcpService.listTools(request.sessionId) }
  }

  async handleCallTool(
    _event: unknown,
    request: McpCallToolRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    if (!request?.name) {
      return { success: false, error: 'Missing tool name' }
    }
    return {
      success: true,
      data: await this.mcpService.callTool(request.sessionId, request.name, request.arguments)
    }
  }

  async handleListPrompts(
    _event: unknown,
    request: McpSessionScopedRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return { success: true, data: await this.mcpService.listPrompts(request.sessionId) }
  }

  async handleGetPrompt(
    _event: unknown,
    request: McpGetPromptRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    if (!request?.name) {
      return { success: false, error: 'Missing prompt name' }
    }
    return {
      success: true,
      data: await this.mcpService.getPrompt(request.sessionId, request.name, request.arguments)
    }
  }

  async handleListResources(
    _event: unknown,
    request: McpSessionScopedRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return { success: true, data: await this.mcpService.listResources(request.sessionId) }
  }

  async handleReadResource(
    _event: unknown,
    request: McpReadResourceRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    if (!request?.uri) {
      return { success: false, error: 'Missing resource uri' }
    }
    return {
      success: true,
      data: await this.mcpService.readResource(request.sessionId, request.uri)
    }
  }

  async handleStartChat(
    event: IpcMainInvokeEvent,
    request: McpChatStartRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.providerId || !request?.modelId) {
      return { success: false, error: 'Missing providerId/modelId' }
    }
    return { success: true, data: await this.mcpService.startChat(event.sender, request) }
  }

  async handleAbortChat(
    _event: unknown,
    request: McpChatAbortRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.requestId) {
      return { success: false, error: 'Missing requestId' }
    }
    await this.mcpService.abortChat(request.requestId)
    return { success: true, data: undefined }
  }
}
