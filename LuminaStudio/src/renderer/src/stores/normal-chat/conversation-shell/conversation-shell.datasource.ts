/**
 * @deprecated Unused legacy shell datasource. This directory is not wired into the current normal-chat renderer flow.
 */
import { conversationShellMock } from './conversation-shell.mock'
import type { ConversationShellSnapshot } from './conversation-shell.types'

/**
 * 会话壳层 datasource
 * 说明：先集中路由 mock，后续替换真实会话流时只动 datasource。
 */
export class ConversationShellDatasource {
  async loadSnapshot(): Promise<ConversationShellSnapshot> {
    return structuredClone(conversationShellMock)
  }

  async saveSnapshot(_snapshot: ConversationShellSnapshot): Promise<void> {
    // 预留：未来接入会话缓存/远端同步
  }
}
