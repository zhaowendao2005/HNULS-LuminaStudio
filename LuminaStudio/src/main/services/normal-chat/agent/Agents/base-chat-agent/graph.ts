import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { NormalChatCallMode, NormalChatConversationMessage } from '@preload/types'
import { buildJsonContractPrompt, parseJsonContractOutput } from '../../../json-output'
import type { NormalChatFunctioncallHelper } from '../../../functioncalls/contracts'
import type {
  NormalChatAgentGraphTemplate,
  NormalChatAgentSessionState,
  NormalChatAnswerBuildContext,
  NormalChatChildTaskPayload,
  NormalChatGraphFramework,
  NormalChatGraphHelperBinding,
  NormalChatJsonContractResult,
  NormalChatPlannerDecision
} from '../../contracts'
import { getBaseChatAgentHelperBindings } from './functioncall'

const plannerDecisionSchema = z.object({
  action: z.enum(['answer', 'call-helper', 'dispatch-child', 'fallback']),
  reasoning: z.string().trim().min(1).default(''),
  helperId: z.string().trim().nullable().optional(),
  helperArgs: z.record(z.string(), z.unknown()).nullable().optional(),
  childTask: z
    .object({
      roleKind: z.enum(['worker', 'repair']),
      taskKind: z.enum(['tool-research', 'repair', 'synthesis', 'direct-answer']),
      goal: z.string().trim().min(1),
      summary: z.string().trim().min(1)
    })
    .nullable()
    .optional(),
  finalAnswerHint: z.string().trim().nullable().optional()
})

const helperArgsEnvelopeSchema = z.object({
  helperId: z.string().trim().min(1),
  query: z.string().trim().optional(),
  topK: z.number().int().optional(),
  sort: z.enum(['relevance', 'pub_date']).optional(),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional()
})

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (typeof item === 'object' && item && 'text' in item && typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .join('')
  }

  return String(content ?? '')
}

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

function resolveCallMode(
  session: NormalChatAgentSessionState,
  helperCount: number
): Extract<NormalChatCallMode, 'fast' | 'slow'> {
  if (session.callMode === 'fast' || session.callMode === 'slow') {
    return session.callMode
  }

  if (session.costMode === 'per_call') {
    return helperCount <= 1 ? 'fast' : 'slow'
  }

  if (/搜索|检索|查论文|查文献|look up|search/i.test(session.goal)) {
    return helperCount <= 1 ? 'fast' : 'slow'
  }

  return session.conversationWindow.length > 12 ? 'slow' : 'fast'
}

function applyOverlay(
  baseText: string,
  overlayText: string | undefined,
  mode: 'append' | 'replace'
) {
  if (!overlayText?.trim()) {
    return baseText
  }

  return mode === 'replace' ? overlayText.trim() : `${baseText}\n${overlayText.trim()}`
}

function buildHelperPromptAssets(
  binding: NormalChatGraphHelperBinding | undefined,
  helper: NormalChatFunctioncallHelper
) {
  const overlayMode = binding?.overlayMode ?? 'append'
  return {
    description: applyOverlay(helper.description, binding?.descriptionOverlay, overlayMode),
    schemaPrompt: applyOverlay(helper.schemaPrompt, binding?.schemaOverlay, overlayMode),
    progressivePrompt: applyOverlay(
      helper.progressivePrompt,
      binding?.progressiveOverlay,
      overlayMode
    )
  }
}

function toPlannerDecision(
  parsed: NormalChatJsonContractResult<z.infer<typeof plannerDecisionSchema>>
): NormalChatPlannerDecision {
  if (!parsed.parsedJson) {
    return {
      action: 'fallback',
      reasoning: parsed.validationError || 'planner decision parse failed',
      helperId: null,
      helperArgs: null,
      childTask: null,
      finalAnswerHint: null,
      rawText: parsed.rawText,
      parsedJson: parsed.parsedJsonText,
      repairAttempted: parsed.repairAttempted,
      validationError: parsed.validationError
    }
  }

  return {
    action: parsed.parsedJson.action,
    reasoning: parsed.parsedJson.reasoning,
    helperId: parsed.parsedJson.helperId ?? null,
    helperArgs: parsed.parsedJson.helperArgs ?? null,
    childTask:
      (parsed.parsedJson.childTask as NormalChatChildTaskPayload | null | undefined) ?? null,
    finalAnswerHint: parsed.parsedJson.finalAnswerHint ?? null,
    rawText: parsed.rawText,
    parsedJson: parsed.parsedJsonText,
    repairAttempted: parsed.repairAttempted,
    validationError: parsed.validationError
  }
}

async function invokeJsonContract<T>(
  session: NormalChatAgentSessionState,
  framework: NormalChatGraphFramework,
  messages: BaseMessage[],
  schema: z.ZodType<T>
): Promise<NormalChatJsonContractResult<T>> {
  const model = await framework.services.createChatModel(
    session.providerId,
    session.modelId,
    session.signal
  )
  const response = await model.invoke(messages, {
    signal: session.signal
  })
  const rawText = extractMessageText(response.content)
  const parsed = parseJsonContractOutput(rawText, schema)

  return {
    rawText,
    parsedJson: parsed.parsedJson,
    parsedJsonText: parsed.repairedText ?? parsed.extractedText,
    repairAttempted: parsed.repairAttempted,
    validationError: parsed.validationError
  }
}

class BaseAgentGraphImpl implements NormalChatAgentGraphTemplate {
  private readonly helperBindings = getBaseChatAgentHelperBindings()

  async run(
    session: NormalChatAgentSessionState,
    framework: NormalChatGraphFramework
  ): Promise<{ summary: string }> {
    framework.beginAgent(session)

    let latestSummary = session.summary
    let currentRetryCount = session.retryCount
    let localWindow = [...session.conversationWindow]
    const helperBindings = this.helperBindings
    const helperCount = helperBindings.length
    const resolvedCallMode = resolveCallMode(session, helperCount)

    for (let stepIndex = 1; stepIndex <= framework.getStepLimit(session); stepIndex += 1) {
      framework.syncAgent(session, {
        retryCount: currentRetryCount,
        summary: latestSummary,
        conversationWindow: localWindow
      })

      let decision: NormalChatPlannerDecision

      if (resolvedCallMode === 'fast') {
        const helperSections = helperBindings
          .map((binding) => {
            const helper = framework.services.functioncallRegistry.requireHelper(binding.helperId)
            const assets = buildHelperPromptAssets(binding, helper)
            return [
              `Helper: ${helper.id}`,
              `Display Name: ${helper.displayName}`,
              assets.description,
              '',
              `Schema Prompt:\n${assets.schemaPrompt}`
            ].join('\n')
          })
          .join('\n\n')

        const parsed = await invokeJsonContract(
          session,
          framework,
          [
            new SystemMessage(
              [
                session.systemPrompt || '你是 LuminaStudio Normal Chat 的 director。',
                '',
                `你当前是 ${session.roleKind}，负责处理任务：${session.goal}`,
                `当前模式：${resolvedCallMode}。你可以在一个 JSON 里直接决定 answer / call-helper / dispatch-child / fallback。`,
                `当前成本模式：${session.costMode}。`,
                `当前 depth=${session.depth}，retry=${currentRetryCount}/${session.maxRetries}。`,
                '',
                '当前可用 helper：',
                helperSections,
                '',
                buildJsonContractPrompt({
                  contractName: '当前步骤决策',
                  schemaPrompt: `
{
  "action": "answer | call-helper | dispatch-child | fallback",
  "reasoning": "string",
  "helperId": "string | null",
  "helperArgs": { "..." : "..." } | null,
  "childTask": {
    "roleKind": "worker | repair",
    "taskKind": "tool-research | repair | synthesis | direct-answer",
    "goal": "string",
    "summary": "string"
  } | null,
  "finalAnswerHint": "string | null"
}
`.trim(),
                  extraRules: [
                    '如果 action=call-helper，必须同时返回 helperId 和 helperArgs。',
                    '如果 action=dispatch-child，必须同时返回 childTask。',
                    '如果 action=answer，优先在 finalAnswerHint 里给出可直接整理为最终回复的答题要点。'
                  ]
                })
              ].join('\n')
            ),
            ...localWindow.map((message) =>
              message.role === 'assistant'
                ? new AIMessage(message.content)
                : message.role === 'system'
                  ? new SystemMessage(message.content)
                  : new HumanMessage(message.content)
            ),
            new HumanMessage(`请围绕下面这个目标做出本轮决策：${session.goal}`)
          ],
          plannerDecisionSchema
        )
        decision = toPlannerDecision(parsed)
      } else {
        const helperDescriptions = helperBindings
          .map((binding) => {
            const helper = framework.services.functioncallRegistry.requireHelper(binding.helperId)
            const assets = buildHelperPromptAssets(binding, helper)
            return [
              `Helper: ${helper.id}`,
              `Display Name: ${helper.displayName}`,
              assets.description
            ].join('\n')
          })
          .join('\n\n')

        const slowDecision = await invokeJsonContract(
          session,
          framework,
          [
            new SystemMessage(
              [
                session.systemPrompt || '你是 LuminaStudio Normal Chat 的 director。',
                '',
                `你当前是 ${session.roleKind}，负责处理任务：${session.goal}`,
                `当前模式：${resolvedCallMode}。先决定是否需要 helper 或 child-agent，再进入下一步。`,
                `当前成本模式：${session.costMode}。`,
                `当前 depth=${session.depth}，retry=${currentRetryCount}/${session.maxRetries}。`,
                '',
                '当前可用 helper：',
                helperDescriptions,
                '',
                buildJsonContractPrompt({
                  contractName: 'slow 模式第一阶段决策',
                  schemaPrompt: `
{
  "action": "answer | call-helper | dispatch-child | fallback",
  "reasoning": "string",
  "helperId": "string | null",
  "childTask": {
    "roleKind": "worker | repair",
    "taskKind": "tool-research | repair | synthesis | direct-answer",
    "goal": "string",
    "summary": "string"
  } | null,
  "finalAnswerHint": "string | null"
}
`.trim()
                })
              ].join('\n')
            ),
            ...localWindow.map((message) =>
              message.role === 'assistant'
                ? new AIMessage(message.content)
                : message.role === 'system'
                  ? new SystemMessage(message.content)
                  : new HumanMessage(message.content)
            ),
            new HumanMessage(`请先决定当前目标应该如何推进：${session.goal}`)
          ],
          z.object({
            action: z.enum(['answer', 'call-helper', 'dispatch-child', 'fallback']),
            reasoning: z.string().trim().min(1).default(''),
            helperId: z.string().trim().nullable().optional(),
            childTask: z
              .object({
                roleKind: z.enum(['worker', 'repair']),
                taskKind: z.enum(['tool-research', 'repair', 'synthesis', 'direct-answer']),
                goal: z.string().trim().min(1),
                summary: z.string().trim().min(1)
              })
              .nullable()
              .optional(),
            finalAnswerHint: z.string().trim().nullable().optional()
          })
        )

        const phaseOneDecision = toPlannerDecision({
          rawText: slowDecision.rawText,
          parsedJson: slowDecision.parsedJson
            ? ({
                ...slowDecision.parsedJson,
                helperArgs: null
              } as z.infer<typeof plannerDecisionSchema>)
            : null,
          parsedJsonText: slowDecision.parsedJsonText,
          repairAttempted: slowDecision.repairAttempted,
          validationError: slowDecision.validationError
        })

        if (phaseOneDecision.action === 'call-helper' && phaseOneDecision.helperId) {
          const binding = helperBindings.find((item) => item.helperId === phaseOneDecision.helperId)
          const helper = framework.services.functioncallRegistry.requireHelper(
            phaseOneDecision.helperId
          )
          const assets = buildHelperPromptAssets(binding, helper)
          const helperArgsDecision = await invokeJsonContract(
            session,
            framework,
            [
              new SystemMessage(
                [
                  session.systemPrompt || '你是 LuminaStudio Normal Chat 的 director。',
                  '',
                  `当前 helper: ${helper.displayName}`,
                  `当前模式：${resolvedCallMode}。你现在只负责为 helper 生成参数。`,
                  assets.progressivePrompt,
                  '',
                  buildJsonContractPrompt({
                    contractName: `${helper.id} 参数`,
                    schemaPrompt: assets.schemaPrompt,
                    extraRules: ['只返回 helper 参数对象，不要重复返回 action。']
                  })
                ].join('\n')
              ),
              ...localWindow.map((message) =>
                message.role === 'assistant'
                  ? new AIMessage(message.content)
                  : message.role === 'system'
                    ? new SystemMessage(message.content)
                    : new HumanMessage(message.content)
              ),
              new HumanMessage(`请为这个 helper 生成本轮参数：${session.goal}`)
            ],
            helperArgsEnvelopeSchema
          )

          decision = {
            action: 'call-helper',
            reasoning: phaseOneDecision.reasoning,
            helperId: phaseOneDecision.helperId,
            helperArgs: helperArgsDecision.parsedJson
              ? {
                  query: helperArgsDecision.parsedJson.query,
                  topK: helperArgsDecision.parsedJson.topK,
                  sort: helperArgsDecision.parsedJson.sort,
                  startDate: helperArgsDecision.parsedJson.startDate,
                  endDate: helperArgsDecision.parsedJson.endDate
                }
              : null,
            childTask: null,
            finalAnswerHint: phaseOneDecision.finalAnswerHint,
            rawText: `${phaseOneDecision.rawText}\n\n${helperArgsDecision.rawText}`,
            parsedJson: helperArgsDecision.parsedJsonText,
            repairAttempted: phaseOneDecision.repairAttempted || helperArgsDecision.repairAttempted,
            validationError: helperArgsDecision.validationError
          }
        } else {
          decision = phaseOneDecision
        }
      }

      framework.recordDecision(session, stepIndex, decision)

      if (decision.action === 'answer') {
        const finalSummary = decision.finalAnswerHint || decision.reasoning || latestSummary
        framework.completeAgent(session, 'completed', finalSummary, null)
        return { summary: finalSummary }
      }

      if (decision.action === 'fallback') {
        const finalSummary = decision.reasoning || latestSummary
        framework.markFallback()
        framework.completeAgent(session, 'fallback', finalSummary, null)
        return { summary: finalSummary }
      }

      if (decision.action === 'call-helper' && decision.helperId && decision.helperArgs) {
        try {
          const helperResult = await framework.executeHelper(
            session,
            decision.helperId,
            decision.helperArgs,
            decision.reasoning
          )
          latestSummary = helperResult.summary
          localWindow = [
            ...localWindow,
            {
              role: 'assistant',
              content: `helper 结果摘要：${helperResult.summary}`
            }
          ]
          continue
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)

          if (currentRetryCount < session.maxRetries) {
            currentRetryCount += 1
            latestSummary = `${decision.helperId} 调用失败，准备重试。原因：${message}`
            localWindow = [
              ...localWindow,
              {
                role: 'assistant',
                content: `helper 失败，需要重试：${message}`
              }
            ]
            continue
          }

          if (session.roleKind !== 'repair' && session.depth < session.maxRecursionDepth) {
            const repairResult = await framework.dispatchChild(
              session,
              {
                roleKind: 'repair',
                taskKind: 'repair',
                goal: `修复 helper ${decision.helperId} 失败问题，并给出更稳妥的下一步建议。错误：${message}`,
                summary: `helper ${decision.helperId} 失败，需要 repair`
              },
              'slow'
            )
            latestSummary = repairResult.summary
            localWindow = [
              ...localWindow,
              {
                role: 'assistant',
                content: `repair agent 回传摘要：${repairResult.summary}`
              }
            ]
            continue
          }

          framework.markFallback()
          framework.completeAgent(session, 'fallback', null, message)
          return {
            summary: `${decision.helperId} 失败，当前只能保守降级。原因：${message}`
          }
        }
      }

      if (decision.action === 'dispatch-child' && decision.childTask) {
        if (session.depth >= session.maxRecursionDepth) {
          const finalSummary = `已达到递归深度上限，当前在第 ${session.depth} 层直接收口。`
          framework.markFallback()
          framework.completeAgent(session, 'fallback', finalSummary, null)
          return { summary: finalSummary }
        }

        const childResult = await framework.dispatchChild(session, decision.childTask)
        latestSummary = childResult.summary
        localWindow = [
          ...localWindow,
          {
            role: 'assistant',
            content: `子 agent 回传摘要：${childResult.summary}`
          }
        ]
        continue
      }
    }

    const finalSummary = `当前 agent 在 ${framework.getStepLimit(session)} 步内没有自然收口，按保守模式结束。`
    framework.markFallback()
    framework.completeAgent(session, 'fallback', finalSummary, null)
    return { summary: finalSummary }
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
