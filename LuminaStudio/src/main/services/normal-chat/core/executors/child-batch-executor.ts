import type { NormalChatGraphFramework, NormalChatAgentSessionState } from '../../agent/contracts'
import type { NormalChatChildTaskAction, NormalChatCoreObservation } from '../types'

export interface NormalChatChildBatchExecutorParams {
  session: NormalChatAgentSessionState
  framework: NormalChatGraphFramework
  actions: NormalChatChildTaskAction[]
}

/**
 * child batch executor 负责真正的并行子 agent 派发。
 * planner 只声明 task，这里才决定如何并发执行。
 */
export async function executeChildBatch(
  params: NormalChatChildBatchExecutorParams
): Promise<NormalChatCoreObservation[]> {
  const fingerprints = new Set<string>()

  for (const action of params.actions) {
    const fingerprint = JSON.stringify({
      roleKind: action.roleKind,
      taskKind: action.taskKind,
      goal: action.goal.trim().toLowerCase(),
      expectedOutput: action.expectedOutput.trim().toLowerCase()
    })
    if (fingerprints.has(fingerprint)) {
      throw new Error(`同一轮 child-task 出现重复目标：${action.goal}`)
    }
    fingerprints.add(fingerprint)
  }

  const settled = await Promise.allSettled(
    params.actions.map((action) =>
      params.framework.dispatchChild(params.session, {
        roleKind: action.roleKind,
        taskKind: action.taskKind,
        goal: action.goal,
        summary: action.summary
      })
    )
  )

  return settled.map((result, index) => {
    const action = params.actions[index]
    if (result.status === 'fulfilled') {
      return {
        kind: 'child-observation' as const,
        actionId: action.actionId,
        summary: result.value.summary,
        status: 'success' as const,
        errorMessage: null
      }
    }

    return {
      kind: 'child-observation' as const,
      actionId: action.actionId,
      summary: action.summary,
      status: 'error' as const,
      errorMessage: result.reason instanceof Error ? result.reason.message : String(result.reason)
    }
  })
}
