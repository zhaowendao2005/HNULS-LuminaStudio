import type { OFNodeLlmSpec } from '../../node-definition'
import { llmNodeDslDefinition } from './dsl'

export const llmNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: llmNodeDslDefinition.authoringToken,
  title: 'llm',
  summary: '调用模型，支持 prompt_template 和 structured_output。',
  capability_summary: '根据 prompt 调用模型，并自动发布文本输出与可选结构化输出。',
  boundaries_zh: [
    '只负责模型调用与输出发布，不负责变量清洗和流程控制。',
    '结构化输出 schema 必须来自作者态 struct，而不是 runtime 内部字段。'
  ],
  input_dependencies: ['上游变量引用', 'model = "provider/model"', 'prompt 字符串'],
  output_artifacts: ['llmoutput', 'structured_output(enabled=true)'],
  composition_hints: ['常与 start / set / end 组合。', '需要结构化结果时补 struct。'],
  section_template: '[node.<id>]',
  required_fields: ['type', 'model', 'prompt'],
  optional_fields: ['title', 'description', 'struct'],
  examples: llmNodeDslDefinition.examples,
  warnings_zh: [
    '`model` 必须写成 `provider/model`，不能拆成旧内部字段。',
    '`struct` 省略时表示只要文本输出，不要手写 structured_output JSON。'
  ],
  output_policies: ['输出变量按节点命名空间自动派生。'],
  omit_rules: [
    '不要输出 `data.output.variables`、`structured_output.schema:null` 等 runtime 字段。'
  ],
  notes: ['LLM 节点输出变量由系统按节点命名空间自动派生。']
}
