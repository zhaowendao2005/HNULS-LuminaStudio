import type { NormalChatConversationDevScenarioCard } from '@preload/types'
import { getNormalChatConversationDevScenarioCards } from '@renderer/stores/normal-chat/conversation/conversation.mock'

export type ChatflowDevScenarioCard = NormalChatConversationDevScenarioCard

export const CHATFLOW_DEV_SCENARIOS: ChatflowDevScenarioCard[] =
  getNormalChatConversationDevScenarioCards()
