import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type {
  NormalChatPlannerDecisionContext,
  NormalChatPlannerDecision
} from '../../../contracts'
import { buildJsonContractPrompt } from '../../../../json-output'
import {
  buildHelperDescriptionPrompt,
  buildHelperProgressivePrompt,
  buildHelperSchemaPrompt
} from '../../../../functioncalls/prompt-assets'
import { helperArgsEnvelopeSchema, slowPlanSchema } from './decision.types'
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

export async function runSlowPlannerDecision(
  context: NormalChatPlannerDecisionContext
): Promise<NormalChatPlannerDecision> {
  const model = await context.services.createChatModel(
    context.session.providerId,
    context.session.modelId,
    context.session.signal
  )

  const phaseOnePrompt = buildJsonContractPrompt({
    contractName: 'slow planner phase one',
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

  const phaseOneResponse = await model.invoke(
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
          buildHelperDescriptionPrompt(context.helpers),
          '',
          phaseOnePrompt
        ].join('\n')
      ),
      ...context.windowMessages,
      new HumanMessage(context.userTaskPrompt)
    ],
    { signal: context.session.signal }
  )

  const phaseOneRawText = extractMessageText(phaseOneResponse.content)
  const phaseOneParsed = repairDecisionWithSchema(phaseOneRawText, slowPlanSchema)
  if (!phaseOneParsed.parsedJson) {
    return {
      ...buildFallbackDecision(phaseOneParsed.validationError || 'slow planner phase one failed'),
      rawText: phaseOneRawText,
      parsedJson: phaseOneParsed.repairedText ?? phaseOneParsed.extractedText,
      repairAttempted: phaseOneParsed.repairAttempted,
      validationError: phaseOneParsed.validationError
    }
  }

  if (phaseOneParsed.parsedJson.action !== 'call-helper' || !phaseOneParsed.parsedJson.helperId) {
    return {
      action: phaseOneParsed.parsedJson.action,
      reasoning: phaseOneParsed.parsedJson.reasoning,
      helperId: phaseOneParsed.parsedJson.helperId ?? null,
      helperArgs: null,
      childTask: phaseOneParsed.parsedJson.childTask ?? null,
      finalAnswerHint: phaseOneParsed.parsedJson.finalAnswerHint ?? null,
      rawText: phaseOneRawText,
      parsedJson: phaseOneParsed.repairedText ?? phaseOneParsed.extractedText,
      repairAttempted: phaseOneParsed.repairAttempted,
      validationError: phaseOneParsed.validationError
    }
  }

  const selectedHelper = context.services.functioncallRegistry.requireHelper(
    phaseOneParsed.parsedJson.helperId
  )
  const phaseTwoPrompt = buildJsonContractPrompt({
    contractName: 'helper args',
    schemaPrompt: buildHelperSchemaPrompt(selectedHelper),
    extraRules: [
      '只返回 helper 参数对象，不要重复返回 action。',
      'helperId 必须与当前选中的 helper 保持一致。'
    ]
  })

  const phaseTwoResponse = await model.invoke(
    [
      new SystemMessage(
        [
          context.rolePrompt,
          '',
          context.callModePrompt,
          context.costModePrompt,
          context.recursionPrompt,
          '',
          buildHelperProgressivePrompt(selectedHelper),
          '',
          phaseTwoPrompt
        ].join('\n')
      ),
      ...context.windowMessages,
      new HumanMessage(context.userTaskPrompt)
    ],
    { signal: context.session.signal }
  )

  const phaseTwoRawText = extractMessageText(phaseTwoResponse.content)
  const phaseTwoParsed = repairDecisionWithSchema(phaseTwoRawText, helperArgsEnvelopeSchema)

  return {
    action: 'call-helper',
    reasoning: phaseOneParsed.parsedJson.reasoning,
    helperId: selectedHelper.id,
    helperArgs: phaseTwoParsed.parsedJson
      ? {
          query: phaseTwoParsed.parsedJson.query,
          topK: phaseTwoParsed.parsedJson.topK,
          sort: phaseTwoParsed.parsedJson.sort,
          startDate: phaseTwoParsed.parsedJson.startDate,
          endDate: phaseTwoParsed.parsedJson.endDate
        }
      : null,
    childTask: null,
    finalAnswerHint: phaseOneParsed.parsedJson.finalAnswerHint ?? null,
    rawText: `${phaseOneRawText}\n\n${phaseTwoRawText}`,
    parsedJson: phaseTwoParsed.repairedText ?? phaseTwoParsed.extractedText,
    repairAttempted: phaseOneParsed.repairAttempted || phaseTwoParsed.repairAttempted,
    validationError: phaseTwoParsed.validationError
  }
}
