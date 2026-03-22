import type { NormalChatConversationMessage } from '@preload/types'

export interface NormalChatConversationDisplayMessage {
  id: string
  role: NormalChatConversationMessage['role']
  author: string
  time: string
  text: string
  isPending?: boolean
}
