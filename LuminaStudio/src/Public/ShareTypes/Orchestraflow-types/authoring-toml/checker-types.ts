import type { OFAuthoringTomlDiagnosticCategory } from './types'

/**
 * 静态检查严重级别。
 * - error：会影响编译/运行的明确错误
 * - warning：可运行但强烈建议修正
 * - info：仅提示
 */
export type CheckSeverity = 'error' | 'warning' | 'info'

/**
 * 静态检查类别。
 * 说明：这里复用了旧 validator 的类别，并预留扩展。
 */
export type CheckDiagnosticCategory =
  | OFAuthoringTomlDiagnosticCategory
  | 'handle'
  | 'variable'
  | 'default-value'

/**
 * 单条诊断（增强版，支持行号范围）。
 * 注意：按你的要求，diagnostic 本身不携带“修复建议”。
 */
export interface CheckDiagnostic {
  /** 诊断类别 */
  category: CheckDiagnosticCategory
  /** 机器可读错误码（全局唯一） */
  code: string
  /** 严重级别 */
  severity: CheckSeverity
  /** 人类可读错误消息（中文） */
  message: string
  /** 关联的节点 id（可选） */
  nodeId?: string
  /** 关联的 TOML 路径（如 nodes[2].prompt） */
  path?: string
  /** 在原始 TOML 文本中的行号范围（1-based） */
  lineRange?: { start: number; end: number }
  /**
   * 结构化上下文（“事实”信息，不是修复建议）。
   * 给 UI / agent 后续做自动修复提供额外依据。
   */
  context?: Record<string, unknown>
}

/**
 * 行标注：前端 diff/行号 gutter 用。
 * 同一行可能对应多个 diagnostic，这里只保留聚合后的结果。
 */
export interface LineAnnotation {
  /** 1-based 行号 */
  line: number
  /** 该行最高严重级别 */
  severity: CheckSeverity
  /** 该行关联的诊断 code 列表 */
  diagnosticCodes: string[]
}

/** 静态检查完整结果 */
export interface CheckResult {
  /** 是否全部通过（无 error 级别） */
  passed: boolean
  /** 所有诊断条目 */
  diagnostics: CheckDiagnostic[]
  /** 每行标注（用于前端标红渲染） */
  lineAnnotations: LineAnnotation[]
}
