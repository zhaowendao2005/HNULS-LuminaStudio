import type { TomlDiagnosticSuggestionSpec } from '../spec-types'

/**
 * 工作流基座（变量/selector）相关的建议 spec。
 * 说明：这里只放“建议文案”，不放校验逻辑。
 */
export const ofVariableSuggestionSpecs: TomlDiagnosticSuggestionSpec[] = [
  {
    code: 'selector-format-invalid',
    message:
      'selector 建议使用数组格式： ["nodeId", "field"]。例如：variable_selector = ["summarize", "score"]。'
  },
  {
    code: 'selector-node-not-found',
    message: 'selector[0] 必须引用已存在的 nodeId；请确认节点 id 是否拼写正确。'
  },
  {
    code: 'selector-field-not-found',
    message: 'selector[1] 必须是上游节点可产出的变量字段；请检查上游节点是否真的输出了该字段。'
  }
]
