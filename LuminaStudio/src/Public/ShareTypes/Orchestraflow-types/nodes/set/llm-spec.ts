import type { OFNodeLlmSpec } from '../../node-definition'
import { variableAssignNodeDslDefinition } from './dsl'

export const variableAssignNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: variableAssignNodeDslDefinition.authoringToken,
  title: '变量赋值',
  summary: '把变量或常量写入命名空间输出。',
  capability_summary: '把引用值、常量或组合 JSON 写入新的输出命名空间。',
  boundaries_zh: [
    '目标输出变量由 let 规则自动派生，不要手写 output.variables。',
    '组合 JSON 中的 `"@path"` 只在运行时解析。'
  ],
  input_dependencies: ['let 规则数组'],
  output_artifacts: ['rules[*].target_variable'],
  composition_hints: ['适合整理上下游字段。', '常在 end 前做输出整形。'],
  section_template: '[node.<id>]',
  required_fields: ['type', 'let'],
  optional_fields: ['title', 'description'],
  examples: variableAssignNodeDslDefinition.examples,
  selector_policies: [
    'source.mode=ref 时使用 `@ref`，source.mode=value 的组合 JSON 中 `"@path"` 会在运行时解析。'
  ],
  output_policies: ['输出变量按 `target_variable` 自动派生。'],
  omit_rules: ['不要输出 `source_selector`、`constant_value`、`name:type=value` 旧简写。'],
  notes: ['变量赋值节点输出变量由规则目标变量自动派生。']
}
