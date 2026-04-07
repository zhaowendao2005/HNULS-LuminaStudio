import type { NormalChatRoundState, NormalChatRoundStateCreateInput } from './round-state.types'

export class NormalChatRoundStateFactory {
  create(input: NormalChatRoundStateCreateInput): NormalChatRoundState {
    // 新状态机从首轮开始就按“可能经历 answer -> action_plan -> post_action_synthesis”的三态链路建模。
    return {
      executionSnapshot: input.executionSnapshot,
      seedHistoryMessages: input.seedHistoryMessages,
      resolvedActions: input.resolvedActions,
      roundIndex: 0,
      loadedActionKeys: new Set<string>(),
      actionResults: [],
      actionFeedback: [],
      assistantArtifacts: [],
      repairAttempts: [],
      finalReply: '',
      currentModelCallId: null,
      shouldContinue: true,
      hasActionsToExecute: false,
      reachedReactLimit: false,
      actionRoundsUsed: 0,
      postActionSynthesisPending: false,
      lastExecutedActionRunIds: [],
      lastTurnKind: null,
      runtimeBudget: {
        promptBudgetChars: input.executionSnapshot.runtime.promptBudgetChars ?? 28_000,
        roundMemoryWindow: input.executionSnapshot.runtime.roundMemoryWindow ?? 3,
        maxRepairAttempts: input.executionSnapshot.runtime.maxRepairAttempts ?? 2,
        maxProviderRetries: input.executionSnapshot.runtime.maxProviderRetries ?? 2
      }
    }
  }
}
