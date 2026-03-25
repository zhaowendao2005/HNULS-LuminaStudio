import type { NormalChatFunctioncallHelper } from '../../functioncalls/contracts'
import { NormalChatHelperLoopGuard } from '../../functioncalls/loop-guard'
import type { NormalChatGraphFramework, NormalChatAgentSessionState } from '../../agent/contracts'
import type { NormalChatCoreObservation, NormalChatHelperCallAction } from '../types'

export interface NormalChatHelperBatchExecutorParams {
  session: NormalChatAgentSessionState
  framework: NormalChatGraphFramework
  stepIndex: number
  actions: NormalChatHelperCallAction[]
  loopGuard: NormalChatHelperLoopGuard
}

/**
 * helper batch executor 专门负责批量 helper 调用。
 * 这里统一做：
 * - args 校验
 * - fingerprint 去重
 * - 并行执行
 * - observation 汇总
 */
export async function executeHelperBatch(
  params: NormalChatHelperBatchExecutorParams
): Promise<NormalChatCoreObservation[]> {
  const helperFingerprints = new Set<string>()
  const parsedHelpers: Array<{
    action: NormalChatHelperCallAction
    helper: NormalChatFunctioncallHelper
    fingerprint: string
  }> = []

  for (const action of params.actions) {
    const helper = params.framework.services.functioncallRegistry.requireHelper(action.helperId)
    const parsedArgs = helper.argsSchema.parse(action.args)
    const fingerprint = helper.fingerprintArgs(parsedArgs)
    const dedupeKey = `${helper.id}:${fingerprint}`

    if (helperFingerprints.has(dedupeKey)) {
      throw new Error(`同一轮重复调用 helper：${helper.id}，参数指纹重复。`)
    }

    const verdict = params.loopGuard.evaluate(helper.id, fingerprint)
    if (!verdict.allow) {
      throw new Error(verdict.reason ?? `helper ${helper.id} 已触发防重复调用保护。`)
    }

    helperFingerprints.add(dedupeKey)
    parsedHelpers.push({
      action,
      helper,
      fingerprint
    })
  }

  const settled = await Promise.all(
    parsedHelpers.map(async ({ action, helper, fingerprint }, parallelIndex) => {
      const result = await params.framework.executeHelper(
        params.session,
        action.helperId,
        action.args,
        action.reason,
        {
          stepIndex: params.stepIndex,
          batchIndex: 0,
          parallelIndex
        }
      )
      params.loopGuard.record(helper.id, fingerprint, result.assessment)
      return {
        kind: 'helper-observation' as const,
        actionId: action.actionId,
        helperId: action.helperId,
        summary: result.summary,
        outputJson: result.outputJson,
        assessment: result.assessment
      }
    })
  )

  return settled
}
