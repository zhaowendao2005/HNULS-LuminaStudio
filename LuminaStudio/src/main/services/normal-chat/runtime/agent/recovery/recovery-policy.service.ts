import type { NormalChatRoundState } from '../state/round-state.types'

export class NormalChatRecoveryPolicyService {
  shouldContinue(state: NormalChatRoundState): boolean {
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
