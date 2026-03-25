import type { NormalChatPlannerDecision } from '../../../contracts'

export function buildFallbackDecision(reasoning: string): NormalChatPlannerDecision {
  return {
    action: 'fallback',
    reasoning,
    helperId: null,
    helperArgs: null,
    childTask: null,
    finalAnswerHint: null,
    rawText: '',
    parsedJson: null,
    repairAttempted: false,
    validationError: null
  }
}
