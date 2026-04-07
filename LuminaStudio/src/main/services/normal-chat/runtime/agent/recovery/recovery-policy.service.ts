import type { NormalChatRoundState } from '../state/round-state.types'

export class NormalChatRecoveryPolicyService {
  shouldContinue(state: NormalChatRoundState): boolean {
    // action 已经落地后，是否继续的最高优先级不是 retryable，而是必须补完结果消费轮。
    if (state.postActionSynthesisPending) {
      return true
    }

    const latestRepairAttempts = state.repairAttempts.filter(
      (attempt) => attempt.roundIndex === state.roundIndex
    )
    if (latestRepairAttempts.length > state.runtimeBudget.maxRepairAttempts) {
      return false
    }

    return state.shouldContinue
  }

  registerAttempt(
    state: NormalChatRoundState,
    input: {
      kind:
        | 'output_contract_error'
        | 'schema_error'
        | 'validation_error'
        | 'permission_denied'
        | 'provider_error'
        | 'prompt_budget'
      message: string
    }
  ): NormalChatRoundState {
    // repair 次数按错误类型累计，用来限制结构修复/Provider 重试，不影响 action 后的必经 synthesis 轮。
    const currentRetryCount = state.repairAttempts.filter(
      (attempt) => attempt.kind === input.kind
    ).length

    return {
      ...state,
      repairAttempts: [
        ...state.repairAttempts,
        {
          kind: input.kind,
          message: input.message,
          retryCount: currentRetryCount + 1,
          roundIndex: state.roundIndex
        }
      ]
    }
  }
}
