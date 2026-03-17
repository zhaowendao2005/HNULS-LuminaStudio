/**
 * “建议 spec”类型（属于 authoring-toml 的 spec 私域）。
 *
 * 说明：
 * - 只承载建议文本（message），不承载校验逻辑
 * - 未来如果需要更精细的过滤条件，可以在这里扩展 when/contextPredicate
 */
export interface TomlDiagnosticSuggestionSpec {
  /** 对应 CheckDiagnostic.code 或旧 validator 的 diagnostic.code */
  code: string
  /** 给用户展示的建议文本（中文） */
  message: string
}
