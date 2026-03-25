import type { NormalChatConversationMessage, NormalChatRequestMetrics } from '@preload/types'

export interface NormalChatConversationDisplayMessage extends NormalChatConversationMessage {
  author: string
  time: string
  text: string
  isPending?: boolean
  requestMetrics?: NormalChatRequestMetrics | null
}
