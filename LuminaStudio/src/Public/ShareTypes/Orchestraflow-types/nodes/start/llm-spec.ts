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
  input_dependencies: ['inputs[*].schema 中声明的变量定义'],
  output_artifacts: ['input.variables[*].variable'],
  composition_hints: ['通常作为工作流第一个业务节点。', '后续节点通过 @输入名 直接引用开始输入。'],
  section_template: '[node.start]',
  required_fields: ['type', 'inputs'],
  optional_fields: ['title', 'description'],
  examples: startNodeDslDefinition.examples,
  authoring_hints: [...(startInputVariableDefinition.notes_zh || [])],
  warnings_zh: [
    'inputs 数组中的每一项都必须显式带 schema；不要再写旧的 [input.<name>] section。',
    '默认值统一写在 schema.default 或 schema 子字段 default 上，不要写变量级 default。'
  ],
  omit_rules: ['不要输出 `value_selector`、`value_ref`、变量级 `default`、旧的 input section。'],
  notes: ['开始节点把输入变量原样写入变量存储。']
}
