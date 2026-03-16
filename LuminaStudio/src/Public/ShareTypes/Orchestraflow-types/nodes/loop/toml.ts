import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const loopNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'subgraph'],
  optionalFields: ['description', 'loop_count', 'loop_count_selector', 'loop_variables'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "repair_loop"' },
    { key: 'type', required: true, summary: '固定为 loop。', example: 'type = "loop"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "自修复循环"' },
    { key: 'loop_count', required: false, summary: '固定循环次数。', example: 'loop_count = 3' },
    {
      key: 'loop_variables',
      required: false,
      summary: '循环局部变量数组。',
      example:
        'loop_variables = [{ variable = "retry_reason", value_type = "constant", value = "校验失败，继续修复" }]'
    },
    {
      key: 'subgraph',
      required: true,
      summary: '子图定义。',
      example:
        'subgraph = { nodes = [{ id = "child_end", type = "end", title = "结束", outputs = [{ variable_selector = ["retry_reason"] }] }], edges = [] }'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "repair_loop"',
      'type = "loop"',
      'title = "自修复循环"',
      'loop_count = 3',
      'loop_variables = [{ variable = "retry_reason", value_type = "constant", value = "校验失败，继续修复" }]',
      'subgraph = { nodes = [{ id = "child_end", type = "end", title = "结束", outputs = [{ variable_selector = ["retry_reason"] }] }], edges = [] }'
    ].join('\n')
  ]
}
