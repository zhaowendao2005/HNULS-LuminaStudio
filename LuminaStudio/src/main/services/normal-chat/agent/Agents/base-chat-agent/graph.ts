import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import type { NormalChatConversationMessage } from '@preload/types'
import { NormalChatAgentOrchestrator } from '../../../core'
import type {
  NormalChatAgentGraphTemplate,
  NormalChatAgentSessionState,
  NormalChatAnswerBuildContext,
  NormalChatGraphFramework
} from '../../contracts'
import { getBaseChatAgentHelperBindings } from './functioncall'

function buildConversationHistory(
  messages: NormalChatConversationMessage[]
): Array<HumanMessage | AIMessage> {
  return messages
    .map((message) => {
      const text = message.parts
        .filter((part) => part.kind === 'text')
        .map((part) => part.text)
        .join('')

      if (!text) {
        return null
      }

      return message.role === 'assistant' ? new AIMessage(text) : new HumanMessage(text)
    })
    .filter((message): message is HumanMessage | AIMessage => message !== null)
}

/**
 * base-chat-agent 现在变成一个很薄的适配层：
 * - 负责声明自己有哪些 helper binding；
 * - 把真正的控制循环交给 core/orchestrator；
 * - 保留最终回答生成能力。
 *
 * 这样以后看 normal-chat 主行为，不需要再先啃这个文件的大量 if/else。
 */
class BaseAgentGraphImpl implements NormalChatAgentGraphTemplate {
  private readonly orchestrator = new NormalChatAgentOrchestrator({
    helperBindings: getBaseChatAgentHelperBindings()
  })

  async run(
    session: NormalChatAgentSessionState,
    framework: NormalChatGraphFramework
  ): Promise<{ summary: string }> {
    return this.orchestrator.run(session, framework)
  }

  async buildAnswerMessages(
    session: NormalChatAgentSessionState,
    context: NormalChatAnswerBuildContext
  ): Promise<BaseMessage[]> {
    return [
      new SystemMessage(
        [
          session.systemPrompt || '你是 LuminaStudio Normal Chat 助手。',
          '',
          '你现在只负责生成最终对用户可见的回答。',
          '你必须输出一段完整、可直接发送给用户的正文，禁止返回空内容。',
          '不要停留在内部思考状态，不要只做规划，不要只表示“已完成”或“正在处理”。',
          '如果下面提供的内部摘要已经足够回答用户，你必须直接基于它组织出最终答复。',
          '如果信息仍然不足，也必须先明确说明目前已知结果，再给出保守建议或下一步方向。',
          '不要暴露内部运行树、规划 JSON、repair 过程或 helper 参数细节。'
        ].join('\n')
      ),
      ...buildConversationHistory(context.conversationMessages),
      new HumanMessage(
        [
          `用户原始目标：${session.goal}`,
          '',
          '下面是本轮递归式运行得到的内部摘要。',
          '这些内容已经是可用答案素材，你必须把它们整理成自然语言最终回复，不要省略成空答复：',
          context.synthesisSummary
        ].join('\n')
      )
    ]
  }
}

export function createBaseAgentGraph(): NormalChatAgentGraphTemplate {
  return new BaseAgentGraphImpl()
}
