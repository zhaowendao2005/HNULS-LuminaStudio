/**
 * 恢复策略服务
 *
 * 管理 Agent 执行过程中的错误恢复策略，决定是否继续执行下一轮 ReAct。
 *
 * 恢复策略基于两个核心条件：
 * 1. 是否达到 ReAct 上限（reachedReactLimit）→ 达到则停止
 * 2. 当前轮次的修复尝试次数是否超过上限（maxRepairAttempts）→ 超过则停止
 * 3. 状态中的 shouldContinue 标志 → 为 false 则停止
 *
 * 修复尝试类型包括：
 * - output_contract_error：LLM 输出格式不合法（缺少 action 块等）
 * - schema_error：输入参数不符合 Zod Schema
 * - validation_error：业务验证失败
 * - permission_denied：权限检查拒绝
 * - provider_error：LLM 提供商错误
 * - prompt_budget：Prompt 超出预算
 */
import type { NormalChatRoundState } from '../state/round-state.types'

/**
 * 恢复策略服务类
 *
 * 判断 Agent 是否应该继续执行下一轮，以及记录修复尝试。
 */
export class NormalChatRecoveryPolicyService {
  /**
   * 判断是否应该继续执行下一轮
   *
   * @param state - 当前轮次状态
   * @returns true 表示应该继续，false 表示应该停止
   */
  shouldContinue(state: NormalChatRoundState): boolean {
    // 条件 1：已达到 ReAct 上限，停止
    if (state.reachedReactLimit) {
      return false
    }

    // 条件 2：当前轮次的修复尝试次数超过上限，停止
    const latestRepairAttempts = state.repairAttempts.filter(
      (attempt) => attempt.roundIndex === state.roundIndex
    )
    if (latestRepairAttempts.length > state.runtimeBudget.maxRepairAttempts) {
      return false
    }

    // 条件 3：状态中的 shouldContinue 标志
    return state.shouldContinue
  }

  /**
   * 注册一次修复尝试
   *
   * 当 LLM 输出不合法或动作执行失败时，记录一次修复尝试。
   * 修复尝试按类型和轮次索引计数，用于判断是否超过恢复上限。
   *
   * @param state - 当前轮次状态
   * @param input - 修复尝试信息（类型和错误消息）
   * @returns 更新后的轮次状态（包含新增的修复尝试记录）
   */
  registerAttempt(
    state: NormalChatRoundState,
    input: {
      /** 修复尝试的错误类型 */
      kind:
        | 'output_contract_error'
        | 'schema_error'
        | 'validation_error'
        | 'permission_denied'
        | 'provider_error'
        | 'prompt_budget'
      /** 错误消息 */
      message: string
    }
  ): NormalChatRoundState {
    // 统计同类型错误的历史尝试次数
    const currentRetryCount = state.repairAttempts.filter(
      (attempt) => attempt.kind === input.kind
    ).length

    // 返回新的状态对象，追加本次修复尝试记录
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
