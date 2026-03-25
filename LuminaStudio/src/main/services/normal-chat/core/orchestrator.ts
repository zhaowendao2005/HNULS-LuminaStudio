import type {
  NormalChatGraphFramework,
  NormalChatAgentSessionState,
  NormalChatGraphHelperBinding
} from '../agent/contracts'
import { NormalChatHelperLoopGuard } from '../functioncalls/loop-guard'
import { executeChildBatch } from './executors/child-batch-executor'
import { executeHelperBatch } from './executors/helper-batch-executor'
import { NormalChatCorePlanner } from './planner'
import { resolveInitialPhase, resolveNextPhase, validateStepActions } from './state-machine'
import {
  buildCoreBudget,
  toDecisionRecord,
  type NormalChatCoreAction,
  type NormalChatCoreObservation
} from './types'

export interface NormalChatCoreOrchestratorOptions {
  helperBindings: NormalChatGraphHelperBinding[]
}

/**
 * orchestrator 是新的“唯一主循环”。
 * 以后 normal-chat 主要看这个文件，就能知道系统如何规划、执行、收口。
 */
export class NormalChatAgentOrchestrator {
  private readonly planner = new NormalChatCorePlanner()

  constructor(private readonly options: NormalChatCoreOrchestratorOptions) {}

  async run(
    session: NormalChatAgentSessionState,
    framework: NormalChatGraphFramework
  ): Promise<{ summary: string }> {
    framework.beginAgent(session)

    let latestSummary = session.summary
    let currentRetryCount = session.retryCount
    let currentPhase = resolveInitialPhase(session.goal)
    let localWindow = [...session.conversationWindow]
    let observations: NormalChatCoreObservation[] = []
    const helperLoopGuard = new NormalChatHelperLoopGuard()
    const maxSteps = framework.getStepLimit(session)

    for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex += 1) {
      const budget = buildCoreBudget({
        maxSteps,
        stepIndex,
        currentDepth: session.depth,
        maxDepth: session.maxRecursionDepth,
        currentRetries: currentRetryCount,
        maxRetries: session.maxRetries
      })

      framework.syncAgent(session, {
        retryCount: currentRetryCount,
        summary: latestSummary,
        conversationWindow: localWindow
      })

      const planResult = await this.planner.planStep({
        session,
        services: framework.services,
        helperBindings: this.options.helperBindings,
        budget,
        currentPhase,
        latestSummary,
        observations,
        conversationWindow: localWindow
      })

      framework.recordDecision(
        session,
        toDecisionRecord({
          stepIndex,
          budget,
          parseResult: planResult
        })
      )

      if (!planResult.envelope) {
        if (currentRetryCount < session.maxRetries) {
          currentRetryCount += 1
          latestSummary =
            planResult.validationError ?? 'planner 未生成合法 step envelope，准备重试。'
          localWindow = [
            ...localWindow,
            {
              role: 'assistant',
              content: `planner 输出非法，准备重试：${latestSummary}`
            }
          ]
          currentPhase = 'repair'
          continue
        }

        framework.markFallback()
        framework.completeAgent(
          session,
          'fallback',
          latestSummary,
          planResult.validationError ?? 'planner 未生成合法 step envelope'
        )
        return {
          summary: latestSummary || 'planner 连续输出非法结果，已保守降级结束。'
        }
      }

      const actionKinds = planResult.envelope.actions.map((action) => action.kind)
      const validation = validateStepActions({
        phase: planResult.envelope.phase,
        actionKinds,
        isLastStep: budget.isLastStep
      })

      if (!validation.valid) {
        if (currentRetryCount < session.maxRetries) {
          currentRetryCount += 1
          latestSummary = validation.reason ?? '当前 step envelope 不符合状态机约束，准备重试。'
          currentPhase = 'repair'
          localWindow = [
            ...localWindow,
            {
              role: 'assistant',
              content: `状态机拒绝当前 step envelope：${latestSummary}`
            }
          ]
          continue
        }

        framework.markFallback()
        framework.completeAgent(session, 'fallback', latestSummary, validation.reason)
        return {
          summary: latestSummary || 'step envelope 多次违反状态机规则，已保守收口。'
        }
      }

      if (planResult.envelope.statusText?.trim()) {
        framework.emitProgress(session, planResult.envelope.statusText)
      }

      const stepObservations = await this.executeStepActions({
        session,
        framework,
        stepIndex,
        actions: planResult.envelope.actions,
        helperLoopGuard
      })

      observations = stepObservations
      const finalAnswerObservation = stepObservations.find(
        (observation) => observation.kind === 'final-answer-observation'
      )
      if (finalAnswerObservation?.kind === 'final-answer-observation') {
        framework.completeAgent(session, 'completed', finalAnswerObservation.summary, null)
        return {
          summary: finalAnswerObservation.summary
        }
      }

      const fallbackObservation = stepObservations.find(
        (observation) => observation.kind === 'fallback-observation'
      )
      if (fallbackObservation?.kind === 'fallback-observation') {
        framework.markFallback()
        framework.completeAgent(session, 'fallback', fallbackObservation.reason, null)
        return {
          summary: fallbackObservation.reason
        }
      }

      const nextSummary = this.buildObservationSummary(stepObservations)
      if (nextSummary) {
        latestSummary = nextSummary
        localWindow = [
          ...localWindow,
          {
            role: 'assistant',
            content: `本轮 observation 摘要：${nextSummary}`
          }
        ]
      }
      currentPhase = resolveNextPhase({
        currentPhase,
        observations: stepObservations
      })
    }

    framework.completeAgent(session, 'fallback', latestSummary, null)
    return {
      summary: latestSummary || '已达到最大步数，系统按保守模式收口。'
    }
  }

  private async executeStepActions(params: {
    session: NormalChatAgentSessionState
    framework: NormalChatGraphFramework
    stepIndex: number
    actions: NormalChatCoreAction[]
    helperLoopGuard: NormalChatHelperLoopGuard
  }): Promise<NormalChatCoreObservation[]> {
    const helperActions = params.actions.filter(
      (action): action is Extract<NormalChatCoreAction, { kind: 'helper-call' }> =>
        action.kind === 'helper-call'
    )
    const childActions = params.actions.filter(
      (action): action is Extract<NormalChatCoreAction, { kind: 'child-task' }> =>
        action.kind === 'child-task'
    )
    const finalAnswerAction = params.actions.find(
      (action): action is Extract<NormalChatCoreAction, { kind: 'final-answer' }> =>
        action.kind === 'final-answer'
    )
    const fallbackAction = params.actions.find(
      (action): action is Extract<NormalChatCoreAction, { kind: 'fallback' }> =>
        action.kind === 'fallback'
    )

    const observations: NormalChatCoreObservation[] = []

    if (helperActions.length > 0) {
      observations.push(
        ...(await executeHelperBatch({
          session: params.session,
          framework: params.framework,
          stepIndex: params.stepIndex,
          actions: helperActions,
          loopGuard: params.helperLoopGuard
        }))
      )
    }

    if (childActions.length > 0) {
      observations.push(
        ...(await executeChildBatch({
          session: params.session,
          framework: params.framework,
          actions: childActions
        }))
      )
    }

    if (finalAnswerAction) {
      observations.push({
        kind: 'final-answer-observation',
        actionId: finalAnswerAction.actionId,
        summary: finalAnswerAction.answerHint
      })
    }

    if (fallbackAction) {
      observations.push({
        kind: 'fallback-observation',
        actionId: fallbackAction.actionId,
        reason: fallbackAction.reason
      })
    }

    return observations
  }

  private buildObservationSummary(observations: NormalChatCoreObservation[]): string {
    return observations
      .map((observation) => {
        if (observation.kind === 'helper-observation') {
          return observation.summary
        }
        if (observation.kind === 'child-observation') {
          return observation.summary
        }
        if (observation.kind === 'final-answer-observation') {
          return observation.summary
        }
        return observation.reason
      })
      .filter(Boolean)
      .join('\n')
  }
}
