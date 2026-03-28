import type { NormalChatActionCall } from '../../actions/shared/action.types'

export interface NormalChatAgentRoundEnvelope {
  apiMetaMd: string
  replyMd: string
  wantsAction: boolean
  actionCalls: NormalChatActionCall[]
}
