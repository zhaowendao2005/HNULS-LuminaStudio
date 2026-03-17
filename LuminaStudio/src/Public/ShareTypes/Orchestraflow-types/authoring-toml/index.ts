export * from './types'
export * from './diagnostics'
export * from './parser'
export * from './serializer'
export * from './validator'
export * from './compiler'

// ===== 新增：静态检查 + 行号标注（用于 renderer diff 标红） =====
export * from './checker-types'
export * from './line-mapper'
export * from './checker'

// ===== 新增：建议 spec（节点私域 + 基座私域聚合） =====
export * from './spec-types'
export * from './spec-registry'
