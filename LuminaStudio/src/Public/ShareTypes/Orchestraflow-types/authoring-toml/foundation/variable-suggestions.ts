import type { TomlDiagnosticSuggestionSpec } from '../spec-types'

/**
 * 工作流基座（变量/selector）相关的建议 spec。
 * 说明：这里只放“建议文案”，不放校验逻辑。
 */
export const ofVariableSuggestionSpecs: TomlDiagnosticSuggestionSpec[] = [
  {
    code: 'selector-format-invalid',
    message:
      'selector 必须是数组： ["nodeId", "field"]。例如：variable_selector = ["summarize", "llmoutput"]。'
  },
  {
    code: 'selector-node-not-found',
    message:
      'selector 第一段并不是“节点 id”，而是变量存储的 key（变量根）。例如 start 输入变量会直接发布为 key=变量名，所以通常写 ["max_rounds"] 而不是 ["start", "max_rounds"]。'
  },
  {
    code: 'selector-field-not-found',
    message:
      'selector 第二段必须是“该变量根对象”里的字段名；如果你引用的是 start 输入变量，通常根本不需要第二段，直接用 ["变量名"]。例如 max_rounds 就写 ["max_rounds"]。'
  },
  {
    code: 'selector-empty',
    message: 'selector 不能为空；至少需要 ["nodeId", "field"] 两段。'
  }
]
