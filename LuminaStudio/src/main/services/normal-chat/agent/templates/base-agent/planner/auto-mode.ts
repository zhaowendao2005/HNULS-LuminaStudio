import type {
  NormalChatPlannerDecisionContext,
  NormalChatPlannerDecision
} from '../../../contracts'
import { runFastPlannerDecision } from './fast-call'
import { runSlowPlannerDecision } from './slow-call'

export async function runAutoPlannerDecision(
  context: NormalChatPlannerDecisionContext,
  resolvedCallMode: 'fast' | 'slow'
): Promise<NormalChatPlannerDecision> {
  return resolvedCallMode === 'fast'
    ? runFastPlannerDecision(context)
    : runSlowPlannerDecision(context)
}
