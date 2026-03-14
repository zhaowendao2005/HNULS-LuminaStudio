import type { OFNodeLlmSpec } from '../../node-definition'
import { loopNodeDslDefinition } from './dsl'

export const loopNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: loopNodeDslDefinition.authoringToken,
  title: '循环',
  summary: '执行固定次数循环子图，内部自动注入 loop-start。',
  capability_summary: '按循环次数运行子图，并维护 loop 变量与 result 聚合输出。',
  boundaries_zh: [
    '作者只描述业务子图节点，不能手写 loop-start / start_node_id / viewport。',
    'count 只能是整数常量或单个 `@ref`。'
  ],
  input_dependencies: ['count', 'vars', 'subgraph.entry', 'subgraph.edges'],
  output_artifacts: ['result', 'loop_variables[*].variable'],
  composition_hints: ['适合固定轮次的状态更新。', 'vars 用来定义每轮可读写的循环状态。'],
  section_template: '[node.<id>]',
  required_fields: [
    'type',
    'count',
    'vars',
    '[subgraph.<container>].entry',
    '[subgraph.<container>].edges'
  ],
  optional_fields: ['title', 'description'],
  examples: loopNodeDslDefinition.examples,
  warnings_zh: [
    '`vars` 中每个变量都必须给初始化值或单个引用。',
    '组合值必须写成合法 JSON，引用使用 `"@path"` 占位。'
  ],
  selector_policies: ['作者态引用统一写 `@ref`，组合 JSON 中的 `"@path"` 会在运行时解析。'],
  output_policies: ['循环输出由系统聚合为 `result` 和循环变量命名空间。'],
  omit_rules: ['不要输出内部 start 节点、容器 viewport、output.variables。'],
  notes: ['循环输出由系统统一汇总为 result 和循环变量命名空间。']
}
