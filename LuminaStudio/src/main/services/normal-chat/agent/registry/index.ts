import type { NormalChatAgentSuite } from '../contracts'
import { buildDefaultNormalChatAnswerMessages, NormalChatAgentOrchestrator } from '../../core'
import { getBaseChatAgentHelperBindings } from '../Agents/base-chat-agent/functioncall'

const DEFAULT_NORMAL_CHAT_ASSISTANT_PROFILE = {
  name: '基础助手',
  emoji: '🤖',
  defaultSystemPrompt: '你是一个通用中文助手，请直接、清晰地帮助用户完成当前任务。'
}

export function getDefaultNormalChatAssistantProfile() {
  return DEFAULT_NORMAL_CHAT_ASSISTANT_PROFILE
}

export function createNormalChatAgentSuite(): NormalChatAgentSuite {
  return {
    createGraph(context) {
      void context
      const orchestrator = new NormalChatAgentOrchestrator({
        helperBindings: getBaseChatAgentHelperBindings()
      })
      return {
        run(session, framework) {
          return orchestrator.run(session, framework)
        },
        buildAnswerMessages(session, answerContext) {
          return buildDefaultNormalChatAnswerMessages(session, answerContext)
        }
      }
    }
  }
}
