import type { IpcMainInvokeEvent } from 'electron'
import { BaseIPCHandler } from './base-handler'
import type { AiChatService } from '../services/ai-chat/ai-chat-service'
import type {
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatConversationListRequest,
  AiChatCreateAgentRequest,
  AiChatCreateConversationRequest
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
    const { conversationId, agentId, providerId, modelId, input, enableThinking } = request

    if (!conversationId || !agentId || !providerId || !modelId || !input) {
      return { success: false, error: 'Missing required parameters' }
    }

    const result = await this.aiChatService.startStream(event.sender, {
      conversationId,
      agentId,
      providerId,
      modelId,
      input,
      enableThinking
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
   * 获取 Agent 列表
   */
  async handleAgents(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const result = await this.aiChatService.listAgents()
    return { success: true, data: result }
  }

  /**
   * 创建 Agent
   */
  async handleCreateAgent(
    _event: IpcMainInvokeEvent,
    request: AiChatCreateAgentRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { name, description } = request

    if (!name?.trim()) {
      return { success: false, error: 'Missing name' }
    }

    const result = await this.aiChatService.createAgent(name.trim(), description ?? null)
    return { success: true, data: result }
  }

  /**
   * 获取指定 Agent 下的对话列表
   */
  async handleConversations(
    _event: IpcMainInvokeEvent,
    request: AiChatConversationListRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { agentId } = request

    if (!agentId) {
      return { success: false, error: 'Missing agentId' }
    }

    const result = await this.aiChatService.listConversations(agentId)
    return { success: true, data: result }
  }

  /**
   * 创建对话
   */
  async handleCreateConversation(
    _event: IpcMainInvokeEvent,
    request: AiChatCreateConversationRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const { agentId, title, providerId, modelId, enableThinking } = request

    if (!agentId || !providerId || !modelId) {
      return { success: false, error: 'Missing required parameters' }
    }

    const result = await this.aiChatService.createConversation({
      agentId,
      title,
      providerId,
      modelId,
      enableThinking
    })

    return { success: true, data: result }
  }
}
