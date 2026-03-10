import type {
  McpCallToolRequest,
  McpConnectRequest,
  McpGetPromptRequest,
  McpReadResourceRequest
} from '@preload/types'
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
    if (!request?.presetId) {
      return { success: false, error: 'Missing presetId' }
    }
    return { success: true, data: await this.mcpService.connect(request.presetId) }
  }

  async handleDisconnect(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.disconnect() }
  }

  async handleGetSessionState(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.getSessionState() }
  }

  async handleListTools(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.listTools() }
  }

  async handleCallTool(
    _event: unknown,
    request: McpCallToolRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.name) {
      return { success: false, error: 'Missing tool name' }
    }
    return {
      success: true,
      data: await this.mcpService.callTool(request.name, request.arguments)
    }
  }

  async handleListPrompts(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.listPrompts() }
  }

  async handleGetPrompt(
    _event: unknown,
    request: McpGetPromptRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.name) {
      return { success: false, error: 'Missing prompt name' }
    }
    return {
      success: true,
      data: await this.mcpService.getPrompt(request.name, request.arguments)
    }
  }

  async handleListResources(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.mcpService.listResources() }
  }

  async handleReadResource(
    _event: unknown,
    request: McpReadResourceRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.uri) {
      return { success: false, error: 'Missing resource uri' }
    }
    return { success: true, data: await this.mcpService.readResource(request.uri) }
  }
}
