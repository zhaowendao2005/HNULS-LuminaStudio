import type { OFNodeLlmSpec } from '../../node-definition'
import { iterationNodeDslDefinition } from './dsl'

export const iterationNodeLlmSpec: OFNodeLlmSpec = {
  exposed: true,
  authoringToken: iterationNodeDslDefinition.authoringToken,
  title: '迭代',
  summary: '对数组逐项执行子图，内部自动注入 iteration-start。',
  capability_summary: '对数组逐项进入子图执行，并聚合 result 输出。',
  boundaries_zh: [
    '作者只描述业务子图节点，不能手写 iteration-start / start_node_id / viewport。',
    '子图内禁止再嵌套 iter 或 loop。'
  ],
  input_dependencies: [
    '单个数组引用 over',
    '单个结果引用 result',
    'subgraph.entry',
    'subgraph.edges'
  ],
  output_artifacts: ['result'],
  composition_hints: ['适合批量处理列表。', '子图 entry 指向第一个业务节点。'],
  section_template: '[node.<id>]',
  required_fields: [
    'type',
    'over',
    'result',
    '[subgraph.<container>].entry',
    '[subgraph.<container>].edges'
  ],
  optional_fields: ['title', 'description'],
  examples: iterationNodeDslDefinition.examples,
  warnings_zh: [
    '`over` 与 `result` 都必须是单个 `@ref` 字符串。',
    '不要手写 `start_node_id`、`iteration-start` 或 `subgraph.viewport`。'
  ],
  selector_policies: ['作者态引用统一写 `@ref`，底层 selector / ref 由编译器生成。'],
  output_policies: ['迭代输出由系统派生 `result`。'],
  omit_rules: ['不要输出内部 start 节点、容器 viewport、output.variables。'],
  notes: ['子图边必须显式填写 handle。', '迭代输出由系统按 result 变量派生。']
}
