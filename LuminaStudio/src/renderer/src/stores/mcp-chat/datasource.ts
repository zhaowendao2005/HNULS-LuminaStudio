import type {
  McpChatBootstrap,
  McpChatServerCatalogItem,
  McpChatSettingsPayload,
  McpChatSession,
  McpChatStreamEvent
} from '@preload/types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'MCP Chat request failed')
  }
  return response.data
}

/**
 * Electron IPC 只接受可结构化克隆的数据。
 * 这里把来自 Pinia / Vue 的响应式 proxy 提前压平成普通 JSON 对象，避免 invoke 时抛
 * “An object could not be cloned”。
 */
function toPlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const McpChatDataSource = {
  getBootstrap(): Promise<McpChatBootstrap> {
    return window.api.mcpChat.getBootstrap().then(unwrap)
  },
  refreshServers(): Promise<McpChatServerCatalogItem[]> {
    return window.api.mcpChat.refreshServers().then(unwrap)
  },
  createSession(payload: {
    title?: string
    providerId: string
    modelId: string
    memoryRounds?: number
  }): Promise<McpChatSession> {
    return window.api.mcpChat.createSession(payload).then(unwrap)
  },
  updateSession(payload: {
    sessionId: string
    patch: Partial<McpChatSession>
  }): Promise<McpChatSession> {
    return window.api.mcpChat
      .updateSession({
        sessionId: payload.sessionId,
        patch: toPlainValue(payload.patch)
      })
      .then(unwrap)
  },
  deleteSession(sessionId: string): Promise<void> {
    return window.api.mcpChat.deleteSession({ sessionId }).then((response) => {
      if (!response.success) {
        throw new Error(response.error || 'MCP Chat delete session request failed')
      }
    })
  },
  sendMessage(sessionId: string, input: string): Promise<{ requestId: string }> {
    return window.api.mcpChat.sendMessage({ sessionId, input }).then(unwrap)
  },
  abort(requestId: string): Promise<void> {
    return window.api.mcpChat.abort({ requestId }).then((response) => {
      if (!response.success) {
        throw new Error(response.error || 'MCP Chat abort request failed')
      }
    })
  },
  saveSettings(payload: McpChatSettingsPayload): Promise<McpChatSettingsPayload> {
    return window.api.mcpChat.saveSettings(toPlainValue(payload)).then(unwrap)
  },
  onStream(handler: (event: McpChatStreamEvent) => void): () => void {
    return window.api.mcpChat.onStream(handler)
  }
}
