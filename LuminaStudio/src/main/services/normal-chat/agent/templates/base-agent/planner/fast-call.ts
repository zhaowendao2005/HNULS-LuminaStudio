import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type {
  NormalChatPlannerDecisionContext,
  NormalChatPlannerDecision
} from '../../../contracts'
import { buildJsonContractPrompt } from '../../../../json-output'
import {
  buildHelperDescriptionPrompt,
  buildHelperSchemaPrompt
} from '../../../../functioncalls/prompt-assets'
import { plannerDecisionSchema } from './decision.types'
import { buildFallbackDecision } from './fallback-decision'
import { repairDecisionWithSchema } from './repair-decision'

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

export async function runFastPlannerDecision(
  context: NormalChatPlannerDecisionContext
): Promise<NormalChatPlannerDecision> {
  const helpers = context.helpers
  const helperDescriptionPrompt = buildHelperDescriptionPrompt(helpers)
  const helperSchemaPrompt = helpers.map((helper) => buildHelperSchemaPrompt(helper)).join('\n\n')
  const contractPrompt = buildJsonContractPrompt({
    contractName: 'planner decision',
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
      '如果 action=answer，helperId/helperArgs/childTask 都必须为空。'
    ]
  })

  const model = await context.services.createChatModel(
    context.session.providerId,
    context.session.modelId,
    context.session.signal
  )

  const response = await model.invoke(
    [
      new SystemMessage(
        [
          context.rolePrompt,
          '',
          context.callModePrompt,
          context.costModePrompt,
          context.recursionPrompt,
          '',
          '当前 helper 说明：',
          helperDescriptionPrompt,
          '',
          '当前 helper 参数契约：',
          helperSchemaPrompt,
          '',
          contractPrompt
        ].join('\n')
      ),
      ...context.windowMessages,
      new HumanMessage(context.userTaskPrompt)
    ],
    { signal: context.session.signal }
  )

  const rawText = extractMessageText(response.content)
  const parsed = repairDecisionWithSchema(rawText, plannerDecisionSchema)
  if (!parsed.parsedJson) {
    return {
      ...buildFallbackDecision(parsed.validationError || 'planner decision parse failed'),
      rawText,
      parsedJson: parsed.repairedText ?? parsed.extractedText,
      repairAttempted: parsed.repairAttempted,
      validationError: parsed.validationError
    }
  }

  return {
    action: parsed.parsedJson.action,
    reasoning: parsed.parsedJson.reasoning,
    helperId: parsed.parsedJson.helperId ?? null,
    helperArgs: parsed.parsedJson.helperArgs ?? null,
    childTask: parsed.parsedJson.childTask ?? null,
    finalAnswerHint: parsed.parsedJson.finalAnswerHint ?? null,
    rawText,
    parsedJson: parsed.repairedText ?? parsed.extractedText,
    repairAttempted: parsed.repairAttempted,
    validationError: parsed.validationError
  }
}
