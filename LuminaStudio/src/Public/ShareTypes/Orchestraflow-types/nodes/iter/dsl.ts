import type { OFNodeDslDefinition } from '../../node-definition'

export const iterationNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'iter',
  title: '迭代',
  summary: '对数组逐项执行子图，内部自动注入 iteration-start。',
  sectionForm: '[node.<id>]',
  subgraphSectionForm: '[subgraph.<container>]',
  allowedKeys: ['type', 'title', 'description', 'over', 'result'],
  requiredKeys: ['type', 'over', 'result'],
  legacyTokens: ['iteration'],
  legacyKeyReplacements: {
    desc: 'description',
    iterator_ref: 'over',
    output_policy: 'result',
    nodes: '删除该键；子图节点通过 [node.<container>.<child>] section 定义',
    start_node_id: '删除该键；内部 start 节点由系统管理'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "iter"' },
    { label: 'over', summary: '迭代目标数组引用。', value: 'over = "@start.items"' },
    {
      label: 'result',
      summary: '从子图中取每轮结果。',
      value: 'result = "@write.structured_output"'
    },
    { label: 'subgraph.entry', summary: '声明子图业务入口节点。', value: 'entry = "write"' },
    {
      label: 'subgraph.edges',
      summary: '边必须显式写 handle。',
      value: 'edges = ["write.source -> judge.target","judge.pass -> summarize.target"]'
    }
  ]
}
