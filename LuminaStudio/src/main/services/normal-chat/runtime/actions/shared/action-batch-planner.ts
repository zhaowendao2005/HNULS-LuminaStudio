/**
 * 动作批次规划器
 *
 * 负责将 LLM 输出的多个动作调用按并发安全性分组为批次：
 * - 并发安全（isConcurrencySafe）的动作会被归入同一个并行批次
 * - 非并发安全的动作各自独占一个串行批次
 * - 连续的并行批次会合并为一个批次，提高执行效率
 *
 * 例如：[safe, safe, unsafe, safe] → [{parallel:true, [a,b]}, {parallel:false, [c]}, {parallel:true, [d]}]
 */
import type { NormalChatActionCall, NormalChatResolvedAction } from './action.types'

/**
 * 动作批次
 *
 * 表示一组可以一起执行的动作调用。
 */
export interface NormalChatActionBatch {
  /** 是否为并行批次（true 表示批次内所有动作可并发执行） */
  parallel: boolean
  /** 该批次包含的动作调用列表 */
  calls: NormalChatActionCall[]
}

/**
 * 动作批次规划器类
 *
 * 将动作调用列表按并发安全性划分为多个批次。
 */
export class NormalChatActionBatchPlanner {
  /**
   * 将动作调用列表划分为执行批次
   *
   * 遍历所有动作调用，根据每个动作的 isConcurrencySafe 判断
   * 将其归入并行批次或串行批次。连续的并行调用会合并到同一批次中。
   *
   * @param calls - LLM 输出的动作调用列表
   * @param resolvedActions - 已解析的可用动作列表（用于查询并发安全性）
   * @returns 划分后的批次列表
   */
  partitionActionCalls(
    calls: NormalChatActionCall[],
    resolvedActions: NormalChatResolvedAction[]
  ): NormalChatActionBatch[] {
    return calls.reduce<NormalChatActionBatch[]>((batches, call) => {
      // 查找该动作的定义，判断是否支持并发
      const action = resolvedActions.find((item) => item.actionKey === call.actionKey)
      const parallel = Boolean(action?.definition.isConcurrencySafe?.(call.input))

      // 获取当前最后一个批次
      const lastBatch = batches.at(-1)

      // 如果当前动作是并发安全的，且上一个批次也是并行批次，则合并
      if (parallel && lastBatch?.parallel) {
        lastBatch.calls.push(call)
        return batches
      }

      // 否则创建新批次
      batches.push({
        parallel,
        calls: [call]
      })
      return batches
    }, [])
  }
}
