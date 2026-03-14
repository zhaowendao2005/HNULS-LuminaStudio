import type { OFNodeLlmSpec } from '../../node-definition'
import { endNodeDslDefinition } from './dsl'

export const endNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: endNodeDslDefinition.authoringToken,
  title: '结束',
  summary: '映射最终输出变量。',
  capability_summary: '从变量存储读取 selector/template，并生成最终工作流输出。',
  boundaries_zh: [
    '不创建独立输出命名空间，只消费上游变量形成最终结果。',
    '不要手写 value_ref / value_selector。'
  ],
  input_dependencies: ['outputs 数组'],
  output_artifacts: ['data.output.variables[*].variable'],
  composition_hints: ['通常作为工作流最后一个节点。', '需要组合输出时使用 JSON template。'],
  section_template: '[node.end]',
  required_fields: ['type', 'outputs'],
  optional_fields: ['title', 'description'],
  examples: endNodeDslDefinition.examples,
  warnings_zh: ['组合 object/array 输出必须写成合法 JSON，引用使用 `"@path"` 占位。'],
  selector_policies: ['纯引用使用 `<- @ref`；组合值使用 `<- <json-template>`。'],
  omit_rules: ['不要输出 `value_selector`、`value_ref`。'],
  notes: ['结束节点通过 selector/template 从变量存储中提取最终输出。']
}
