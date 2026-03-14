import type { OFNodeLlmSpec } from '../../node-definition'
import { startInputVariableDefinition } from '../../variable-definition'
import { startNodeDslDefinition } from './dsl'

// llmSpec 只保留给模型看的安全作者态说明。
export const startNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: startNodeDslDefinition.authoringToken,
  title: '开始',
  summary: '定义工作流输入变量。',
  capability_summary: '声明运行入口输入，并把输入变量发布到整个工作流上下文。',
  boundaries_zh: ['只负责入口输入，不调用模型，不做业务处理。', '不创建独立输出命名空间。'],
  input_dependencies: ['[input.<name>] 中预先声明的输入变量定义'],
  output_artifacts: ['input.variables[*].variable'],
  composition_hints: ['通常作为工作流第一个业务节点。', '后续节点通过 @输入名 直接引用开始输入。'],
  section_template: '[node.start]',
  required_fields: ['type', 'inputs'],
  optional_fields: ['title', 'description'],
  examples: startNodeDslDefinition.examples,
  authoring_hints: [...(startInputVariableDefinition.notes_zh || [])],
  warnings_zh: [
    '`default` 是运行前预填值，不是 `value_selector`；两者不要混淆。',
    '`array` / `object` 类型的默认值必须写成真实 JSON 值。'
  ],
  omit_rules: ['不要输出 `value_selector`、`value_ref`、内部默认值路径提示这类字段。'],
  notes: ['开始节点把输入变量原样写入变量存储。']
}
