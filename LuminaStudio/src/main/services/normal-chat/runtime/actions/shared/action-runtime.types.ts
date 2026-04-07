/**
 * 动作 Schema 调试快照
 *
 * 用于开发调试阶段，对比动作的运行时 Zod Schema（实际校验用）
 * 与公开 JSON Schema（展示给 LLM 的）之间的差异。
 *
 * 通过 redactionSummary 可以追踪哪些字段被移除或修改，
 * 便于排查 Schema 不一致导致的验证问题。
 */
export interface NormalChatActionSchemaDebugSnapshot {
  /** 动作标识键 */
  actionKey: string
  /** 运行时 Zod Schema 转换后的 JSON Schema（实际校验用） */
  runtimeSchemaJson: Record<string, unknown>
  /** 公开的 JSON Schema（展示给 LLM 的版本） */
  publicSchemaJson: Record<string, unknown>
  /** Schema 脱敏/修改摘要 */
  redactionSummary: {
    /** 被移除的字段路径列表 */
    removedFields: string[]
    /** 被修改的字段列表 */
    changedFields: Array<{
      /** 字段路径（如 'properties.query.type'） */
      fieldPath: string
      /** 修改原因 */
      reason: string
      /** 修改前的值 */
      before?: unknown
      /** 修改后的值 */
      after?: unknown
    }>
  }
}
