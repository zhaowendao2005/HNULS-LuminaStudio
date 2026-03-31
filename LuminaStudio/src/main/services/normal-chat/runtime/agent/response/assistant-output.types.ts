import type { NormalChatActionCall } from '../../actions/shared/action.types'

export interface NormalChatAssistantStructuredOutput {
  body_md: string
  action_calls: NormalChatActionCall[]
}
