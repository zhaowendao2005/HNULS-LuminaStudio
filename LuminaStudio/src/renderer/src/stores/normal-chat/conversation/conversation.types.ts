import type { NormalChatConversationMessage } from '@preload/types'

export interface NormalChatConversationDisplayMessage extends NormalChatConversationMessage {
  author: string
  time: string
  text: string
  isPending?: boolean
}
