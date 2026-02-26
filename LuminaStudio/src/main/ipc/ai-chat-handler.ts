import type { IpcMainInvokeEvent } from 'electron'
import { BaseIPCHandler } from './base-handler'
import type { AiChatService } from '../services/ai-chat/ai-chat-service'
import type {
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatConversationListRequest,
  AiChatCreatePresetRequest,
  AiChatCreateConversationRequest,
  AiChatDeleteConversationRequest,
  AiChatDeletePresetRequest
} from '@preload/types'

/**
 * AiChatIPCHandler
 *
 * 处理 AI 对话相关的 IPC 请求
 *
 * 注册的 channels:
 * - aiChat:start
 * - aiChat:abort
 * - aiChat:history
 */
export class AiChatIPCHandler extends BaseIPCHandler {
  constructor(private readonly aiChatService: AiChatService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'aiChat'
  }

  /**
   * 启动流式生成
   */
  async handleStart(
    event: IpcMainInvokeEvent,
    request: AiChatStartRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const {
      conversationId,
      presetId,
      providerId,
      modelId,
      input,
      enableThinking,
      mode,
      retrieval,
      providerOverride,
      agentModelConfig
    } = request

    if (!conversationId || !presetId || !providerId || !modelId || !input) {
      return { success: false, error: 'Missing required parameters' }
    }

    const result = await this.aiChatService.startStream(event.sender, {
      conversationId,
      presetId,
      providerId,
      modelId,
      input,
      enableThinking,
      mode,
      retrieval,
      providerOverride,
      agentModelConfig
    })

    return { success: true, data: result }
  }

  /**
   * 中断生成
   */
  async handleAbort(
    _event: IpcMainInvokeEvent,
    request: AiChatAbortRequest
  ): Promise<{ success: true; data?: unknown } | { success: false; error: string }> {
    const { requestId } = request

    if (!requestId) {
      return { success: false, error: 'Missing requestId' }
    }

    await this.aiChatService.abort(requestId)
    return { success: true }
  }

  /**
   * 获取对话历史
   */
  async handleHistory(
    _event: IpcMainInvokeEvent,
    request: AiChatHistoryRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { conversationId, limit, offset } = request

    if (!conversationId) {
      return { success: false, error: 'Missing conversationId' }
    }

    const result = await this.aiChatService.getHistory(conversationId, limit, offset)
    return { success: true, data: result }
  }

  /**
   * 获取预设列表
   */
  async handlePresets(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const result = await this.aiChatService.listPresets()
    return { success: true, data: result }
  }

  /**
   * 创建预设
   */
  async handleCreatePreset(
    _event: IpcMainInvokeEvent,
    request: AiChatCreatePresetRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { name, description } = request

    if (!name?.trim()) {
      return { success: false, error: 'Missing name' }
    }

    const result = await this.aiChatService.createPreset(name.trim(), description ?? null)
    return { success: true, data: result }
  }

  /**
   * 获取指定预设下的对话列表
   */
  async handleConversations(
    _event: IpcMainInvokeEvent,
    request: AiChatConversationListRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { presetId } = request

    if (!presetId) {
      return { success: false, error: 'Missing presetId' }
    }

    const result = await this.aiChatService.listConversations(presetId)
    return { success: true, data: result }
  }

  /**
   * 创建对话
   */
  async handleCreateConversation(
    _event: IpcMainInvokeEvent,
    request: AiChatCreateConversationRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { presetId, title, providerId, modelId, enableThinking } = request

    if (!presetId || !providerId || !modelId) {
      return { success: false, error: 'Missing required parameters' }
    }

    const result = await this.aiChatService.createConversation({
      presetId,
      title,
      providerId,
      modelId,
      enableThinking
    })

    return { success: true, data: result }
  }

  /**
   * 删除对话
   */
  async handleDeleteConversation(
    _event: IpcMainInvokeEvent,
    request: AiChatDeleteConversationRequest
  ): Promise<{ success: true; data?: unknown } | { success: false; error: string }> {
    const { conversationId } = request

    if (!conversationId) {
      return { success: false, error: 'Missing conversationId' }
    }

    try {
      await this.aiChatService.deleteConversation(conversationId)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  /**
   * 删除预设
   */
  async handleDeletePreset(
    _event: IpcMainInvokeEvent,
    request: AiChatDeletePresetRequest
  ): Promise<{ success: true; data?: unknown } | { success: false; error: string }> {
    const { presetId } = request

    if (!presetId) {
      return { success: false, error: 'Missing presetId' }
    }

    try {
      await this.aiChatService.deletePreset(presetId)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }
}
