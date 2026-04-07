/**
 * 轮次状态工厂
 *
 * 负责创建 Agent 执行过程中的轮次状态（RoundState）初始对象。
 *
 * 轮次状态是 Agent ReAct 循环中的核心数据结构，
 * 跟踪每一轮的执行进度、动作结果、修复尝试等信息。
 *
 * 初始状态特点：
 * - roundIndex 从 0 开始（prepareRound 中会递增到 1）
 * - shouldContinue 为 true（默认继续执行）
 * - 所有列表和集合初始化为空
 * - 运行时预算从 executionSnapshot 中读取，带默认值
 */
import type { NormalChatRoundState, NormalChatRoundStateCreateInput } from './round-state.types'

/**
 * 轮次状态工厂类
 *
 * 创建 Agent 执行的初始轮次状态。
 */
export class NormalChatRoundStateFactory {
  /**
   * 创建初始轮次状态
   *
   * @param input - 状态创建输入（执行快照、历史消息、已解析动作）
   * @returns 初始化的轮次状态对象
   */
  create(input: NormalChatRoundStateCreateInput): NormalChatRoundState {
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
      runtimeBudget: {
        // Prompt 字符预算，默认 28000 字符
        promptBudgetChars: input.executionSnapshot.runtime.promptBudgetChars ?? 28_000,
        // 轮次记忆窗口大小，默认保留最近 3 轮
        roundMemoryWindow: input.executionSnapshot.runtime.roundMemoryWindow ?? 3,
        // 每轮最大修复尝试次数，默认 2 次
        maxRepairAttempts: input.executionSnapshot.runtime.maxRepairAttempts ?? 2,
        // LLM 提供商最大重试次数，默认 2 次
        maxProviderRetries: input.executionSnapshot.runtime.maxProviderRetries ?? 2
      }
    }
  }
}
