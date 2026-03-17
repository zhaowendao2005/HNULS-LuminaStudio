import type {
  McpChatAbortRequest,
  McpChatCreateSessionRequest,
  McpChatDeleteSessionRequest,
  McpChatSaveSettingsRequest,
  McpChatSendMessageRequest,
  McpChatUpdateSessionRequest
} from '@preload/types'
import { BaseIPCHandler } from './base-handler'
import type { McpChatService } from '../services/mcp-chat'

export class McpChatIPCHandler extends BaseIPCHandler {
  constructor(private readonly mcpChatService: McpChatService) {
    super()
    this.register()

    this.mcpChatService.onStream((event) => {
      this.broadcastToAll('mcpChat:stream', event)
    })
  }

  protected getChannelPrefix(): string {
    return 'mcpChat'
  }

  async handleGetBootstrap(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpChatService.getBootstrap() }
  }

  async handleRefreshServers(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpChatService.refreshServers() }
  }

  async handleCreateSession(
    _event: unknown,
    request: McpChatCreateSessionRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.providerId || !request?.modelId) {
      return { success: false, error: 'Missing providerId or modelId' }
    }
    return {
      success: true,
      data: await this.mcpChatService.createSession(request)
    }
  }

  async handleUpdateSession(
    _event: unknown,
    request: McpChatUpdateSessionRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return {
      success: true,
      data: await this.mcpChatService.updateSession(request.sessionId, request.patch)
    }
  }

  async handleDeleteSession(
    _event: unknown,
    request: McpChatDeleteSessionRequest
  ): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    await this.mcpChatService.deleteSession(request.sessionId)
    return { success: true, data: undefined }
  }

  async handleSendMessage(
    _event: unknown,
    request: McpChatSendMessageRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.sessionId || !request?.input?.trim()) {
      return { success: false, error: 'Missing sessionId or input' }
    }
    return {
      success: true,
      data: await this.mcpChatService.sendMessage(request.sessionId, request.input)
    }
  }

  async handleAbort(
    _event: unknown,
    request: McpChatAbortRequest
  ): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
    if (!request?.requestId) {
      return { success: false, error: 'Missing requestId' }
    }
    await this.mcpChatService.abort(request.requestId)
    return { success: true, data: undefined }
  }

  async handleSaveSettings(
    _event: unknown,
    request: McpChatSaveSettingsRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (
      !request ||
      typeof request.memoryRoundsDefault !== 'number' ||
      typeof request.enableAgentMode !== 'boolean' ||
      typeof request.agentMaxRounds !== 'number'
    ) {
      return { success: false, error: 'Missing mcpChat settings payload' }
    }
    return {
      success: true,
      data: await this.mcpChatService.saveSettings(request)
    }
  }
}
