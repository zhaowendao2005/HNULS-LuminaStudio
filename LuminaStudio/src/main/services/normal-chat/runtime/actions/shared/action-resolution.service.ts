/**
 * 动作解析服务
 *
 * 负责将任务执行快照中的动作配置（actionSnapshots）
 * 解析为完整的已解析动作（NormalChatResolvedAction）。
 *
 * 解析过程：
 * 1. 遍历快照中的每个动作配置
 * 2. 从动作注册表中查找对应的动作定义
 * 3. 若找到定义，则构建已解析动作对象（包含启用状态、执行模式等）
 * 4. 若未找到定义（动作未注册），则跳过该动作
 */
import type { NormalChatTaskExecutionActionSnapshot } from '@preload/types'
import type { NormalChatResolvedAction } from './action.types'
import { getNormalChatActionDefinition } from './action-registry'

/**
 * 动作解析服务类
 *
 * 将任务快照中的动作配置映射为包含完整定义的已解析动作列表。
 */
export class NormalChatActionResolutionService {
  /**
   * 从任务执行快照中解析所有已启用的动作
   *
   * @param actionSnapshots - 任务执行快照中的动作配置列表
   * @returns 已解析的动作列表（跳过未注册的动作）
   */
  resolveEnabledActionsFromSnapshot(
    actionSnapshots: NormalChatTaskExecutionActionSnapshot[]
  ): NormalChatResolvedAction[] {
    const resolvedActions: NormalChatResolvedAction[] = []

    for (const action of actionSnapshots) {
      // 从注册表中查找动作定义
      const definition = getNormalChatActionDefinition(action.actionKey)
      if (!definition) {
        // 动作未注册，跳过
        continue
      }

      // 构建已解析动作对象
      resolvedActions.push({
        actionKey: action.actionKey,
        kind: definition.descriptor.kind,
        enabled: true,
        mode: action.mode === 'slow' ? 'slow' : 'fast',
        definition
      })
    }

    return resolvedActions
  }
}
