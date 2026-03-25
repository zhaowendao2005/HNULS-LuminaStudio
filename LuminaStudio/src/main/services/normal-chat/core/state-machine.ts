import type { NormalChatCoreAction, NormalChatCoreObservation, NormalChatCorePhase } from './types'

/**
 * normal-chat 新状态机。
 *
 * 所有“当前阶段允许做什么、什么时候必须收口”的规则，都集中在这里。
 * 后续如果要改策略，优先改这个文件，而不是再把判断散回 graph。
 */

const PHASE_ALLOWED_ACTIONS: Record<NormalChatCorePhase, NormalChatCoreAction['kind'][]> = {
  strategy: ['helper-call', 'child-task', 'final-answer', 'fallback'],
  evidence: ['helper-call', 'child-task', 'final-answer', 'fallback'],
  synthesize: ['final-answer', 'fallback'],
  repair: ['helper-call', 'child-task', 'final-answer', 'fallback']
}

export interface NormalChatPhaseValidationResult {
  valid: boolean
  reason: string | null
}

export function resolveInitialPhase(goal: string): NormalChatCorePhase {
  return /修复|repair|排查/i.test(goal) ? 'repair' : 'strategy'
}

export function validateStepActions(params: {
  phase: NormalChatCorePhase
  actionKinds: NormalChatCoreAction['kind'][]
  isLastStep: boolean
}): NormalChatPhaseValidationResult {
  if (params.actionKinds.length === 0) {
    return {
      valid: false,
      reason: 'actions 不能为空，planner 至少要给出一个动作。'
    }
  }

  if (params.isLastStep) {
    const illegalAtLastStep = params.actionKinds.find(
      (kind) => kind === 'helper-call' || kind === 'child-task'
    )
    if (illegalAtLastStep) {
      return {
        valid: false,
        reason: `最后一步禁止继续执行 ${illegalAtLastStep}，必须直接收口。`
      }
    }
  }

  const allowedKinds = PHASE_ALLOWED_ACTIONS[params.phase]
  const illegalKind = params.actionKinds.find((kind) => !allowedKinds.includes(kind))
  if (illegalKind) {
    return {
      valid: false,
      reason: `${params.phase} 阶段不允许执行 ${illegalKind}。`
    }
  }

  return {
    valid: true,
    reason: null
  }
}

export function resolveNextPhase(params: {
  currentPhase: NormalChatCorePhase
  observations: NormalChatCoreObservation[]
}): NormalChatCorePhase {
  if (
    params.observations.some(
      (observation) => observation.kind === 'child-observation' && observation.status === 'error'
    )
  ) {
    return 'repair'
  }

  if (
    params.observations.some(
      (observation) =>
        observation.kind === 'helper-observation' && !observation.assessment.shouldContinue
    )
  ) {
    return 'synthesize'
  }

  if (
    params.observations.some(
      (observation) =>
        observation.kind === 'final-answer-observation' ||
        observation.kind === 'fallback-observation'
    )
  ) {
    return 'synthesize'
  }

  if (
    params.observations.some(
      (observation) =>
        observation.kind === 'helper-observation' || observation.kind === 'child-observation'
    )
  ) {
    return 'evidence'
  }

  return params.currentPhase
}
