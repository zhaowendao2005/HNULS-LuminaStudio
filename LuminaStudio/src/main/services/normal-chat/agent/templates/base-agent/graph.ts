import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import type { NormalChatConversationMessage } from '@preload/types'
import type {
  NormalChatAgentGraphTemplate,
  NormalChatAnswerBuildContext,
  NormalChatAgentSessionState,
  NormalChatPlannerDecision,
  NormalChatPlannerDecisionContext,
  NormalChatAgentExecutionServices
} from '../../contracts'
import { resolveAgentCallMode } from './call-mode'
import { buildRolePrompt } from './role-prompts'
import { runFastPlannerDecision } from './planner/fast-call'
import { runSlowPlannerDecision } from './planner/slow-call'
import { runAutoPlannerDecision } from './planner/auto-mode'

function buildConversationWindowMessages(
  session: NormalChatAgentSessionState
): Array<SystemMessage | HumanMessage | AIMessage> {
  return session.conversationWindow.map((message) => {
    if (message.role === 'system') {
      return new SystemMessage(message.content)
    }
    if (message.role === 'assistant') {
      return new AIMessage(message.content)
    }
    return new HumanMessage(message.content)
  })
}

function extractMessageText(message: NormalChatConversationMessage): string {
  return message.parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('')
}

function buildConversationHistory(
  messages: NormalChatConversationMessage[]
): Array<HumanMessage | AIMessage> {
  return messages
    .map((message) => {
      const text = extractMessageText(message)
      if (!text) {
        return null
      }

      if (message.role === 'assistant') {
        return new AIMessage(text)
      }

      return new HumanMessage(text)
    })
    .filter((message): message is HumanMessage | AIMessage => message !== null)
}

export class BaseAgentGraph implements NormalChatAgentGraphTemplate {
  constructor(private readonly services: NormalChatAgentExecutionServices) {}

  async decide(session: NormalChatAgentSessionState): Promise<NormalChatPlannerDecision> {
    const helpers = this.services.functioncallRegistry.listHelpers()
    const rolePrompt = buildRolePrompt(session)
    const resolvedCallMode = resolveAgentCallMode(session, {
      helperCount: helpers.length,
      contextLength: session.conversationWindow.length,
      userForcedTool: /搜索|检索|查文献|look up|search/i.test(session.goal)
    })

    const context: NormalChatPlannerDecisionContext = {
      session,
      services: this.services,
      helpers,
      rolePrompt,
      callModePrompt: `当前 call mode: ${resolvedCallMode}`,
      costModePrompt: `当前 cost mode: ${session.costMode}`,
      recursionPrompt: `当前 retry=${session.retryCount}/${session.maxRetries}，depth=${session.depth}/${session.maxRecursionDepth}`,
      windowMessages: buildConversationWindowMessages(session),
      userTaskPrompt: `请围绕下面这个局部目标做决策：${session.goal}`
    }

    if (session.callMode === 'fast') {
      return runFastPlannerDecision(context)
    }

    if (session.callMode === 'slow') {
      return runSlowPlannerDecision(context)
    }

    return runAutoPlannerDecision(context, resolvedCallMode as 'fast' | 'slow')
  }

  async buildAnswerMessages(
    session: NormalChatAgentSessionState,
    context: NormalChatAnswerBuildContext
  ): Promise<BaseMessage[]> {
    const conversationHistory = buildConversationHistory(context.conversationMessages)

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
          '不要暴露内部运行树、规划 JSON、repair 过程或 helper 参数细节。',
          '如果外部资料不足，要明确说“不足”，但仍尽量给出保守帮助。'
        ].join('\n')
      ),
      ...conversationHistory,
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
