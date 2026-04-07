/**
 * Schema 调试快照工厂
 *
 * 用于创建动作的 Schema 调试快照，方便开发阶段对比
 * 运行时 Zod Schema 与公开 JSON Schema 之间的差异。
 *
 * 调试快照包含：
 * - runtimeSchemaJson：Zod Schema 转换后的 JSON Schema（实际校验用）
 * - publicSchemaJson：面向 LLM 的公开 JSON Schema
 * - redactionSummary：字段移除/修改的摘要（用于追踪 Schema 差异）
 */
import type { ZodTypeAny } from 'zod/v4'
import type { NormalChatActionSchemaDebugSnapshot } from './action-runtime.types'
import { zodToJsonSchema } from './zod-json-schema'

/**
 * 创建动作 Schema 调试快照
 *
 * @param input - 快照创建参数
 * @param input.actionKey - 动作标识键
 * @param input.runtimeSchema - 运行时 Zod Schema（用于实际输入校验）
 * @param input.publicSchema - 公开 JSON Schema（展示给 LLM 的版本）
 * @param input.removedFields - 可选的被移除字段列表
 * @returns Schema 调试快照对象
 */
export function createActionSchemaDebugSnapshot(input: {
  actionKey: string
  runtimeSchema: ZodTypeAny
  publicSchema: Record<string, unknown>
  removedFields?: string[]
}): NormalChatActionSchemaDebugSnapshot {
  return {
    actionKey: input.actionKey,
    // 将 Zod Schema 转换为 JSON Schema 格式
    runtimeSchemaJson: zodToJsonSchema(input.runtimeSchema),
    publicSchemaJson: input.publicSchema,
    redactionSummary: {
      removedFields: input.removedFields ?? [],
      changedFields: []
    }
  }
}
