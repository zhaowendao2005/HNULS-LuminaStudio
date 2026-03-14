import type { OFNodeLlmSpec } from '../../node-definition'
import { ifNodeDslDefinition } from './dsl'

export const ifNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: ifNodeDslDefinition.authoringToken,
  title: '条件分支',
  summary: '按条件选择分支 handle。',
  capability_summary: '根据 when 条件选择控制流分支。',
  boundaries_zh: [
    '只负责控制流分支，不创建稳定数据命名空间。',
    '条件中的 selector/ref 由编译器生成，不要手写 compare_ref。'
  ],
  input_dependencies: ['上游变量引用', 'when 条件数组'],
  output_artifacts: ['matchedHandleId', 'matchedLabel', 'caseEvaluations'],
  composition_hints: ['用于分流后续控制边。', '常接在 llm / start / set 之后。'],
  section_template: '[node.<id>]',
  required_fields: ['type', 'when'],
  optional_fields: ['title', 'description', 'else_label'],
  examples: ifNodeDslDefinition.examples,
  warnings_zh: [
    '聚合判断仅支持 `all_true / any_true / all_false / any_false`，不要写自由文本表达式。'
  ],
  selector_policies: ['作者态引用统一写 `@ref`，底层 selector / ref 由编译器生成。'],
  omit_rules: ['不要输出 `compare_selector`、`compare_ref`、`elseCase`。'],
  notes: ['IfElse 节点通过 control.selectedSourceHandleIds 驱动后续边选择。']
}
