/**
 * OrchestraFlow AI Schema entry.
 *
 * 代码即文档：
 * - 对外导出的目标是最终可运行工作流，而不是内部中间结构。
 * - 未来新增节点时，应优先扩展 descriptor registry，保证运行时、导出和编译三者一致。
 */
export * from './registry'
export * from './builder'
export * from './compiler'
export * from './validator'
