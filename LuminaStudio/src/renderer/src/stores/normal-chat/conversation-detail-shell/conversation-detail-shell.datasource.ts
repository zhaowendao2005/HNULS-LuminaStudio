import { conversationDetailShellMockApi } from './conversation-detail-shell.mock'
import type {
  ConversationDetailShellRecord,
  ConversationDetailShellSnapshot
} from './conversation-detail-shell.types'

export class ConversationDetailShellDatasource {
  async loadSnapshot(): Promise<ConversationDetailShellSnapshot> {
    return conversationDetailShellMockApi.createSnapshot()
  }

  async getConversationDetail(requestId: string): Promise<ConversationDetailShellRecord> {
    return conversationDetailShellMockApi.getConversationDetail(requestId)
  }
}
