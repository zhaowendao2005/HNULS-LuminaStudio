import type { OFNodeDslDefinition } from '../../node-definition'

export const loopNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'loop',
  title: '循环',
  summary: '执行固定次数循环子图，内部自动注入 loop-start。',
  sectionForm: '[node.<id>]',
  subgraphSectionForm: '[subgraph.<container>]',
  allowedKeys: ['type', 'title', 'description', 'count', 'vars'],
  requiredKeys: ['type', 'count', 'vars'],
  legacyKeyReplacements: {
    desc: 'description',
    loop_count_ref: 'count',
    max_iterations: 'count',
    loop_condition: 'count 或 break_conditions',
    nodes: '删除该键；子图节点通过 [node.<container>.<child>] section 定义',
    start_node_id: '删除该键；内部 start 节点由系统管理'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "loop"' },
    { label: 'count-constant', summary: '常量循环次数。', value: 'count = 3' },
    {
      label: 'count-ref',
      summary: '也支持单个引用决定次数。',
      value: 'count = "@start.processing_config.loop_count"'
    },
    {
      label: 'vars',
      summary: '每个循环变量都必须给初始值、单个引用或组合 JSON。',
      value:
        'vars = ["counter:number=0","payload:object={\\"draft\\":\\"@start.seed\\",\\"round\\":0}"]'
    }
  ]
}
