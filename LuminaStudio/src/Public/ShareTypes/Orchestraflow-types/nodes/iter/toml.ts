import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const iterationNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'iterator_selector', 'subgraph'],
  optionalFields: [
    'description',
    'output_selector',
    'parallel_mode',
    'parallel_nums',
    'error_handle_mode',
    'flatten_output'
  ],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "loop_items"' },
    { key: 'type', required: true, summary: '固定为 iter。', example: 'type = "iter"' },
    {
      key: 'iterator_selector',
      required: true,
      summary: '迭代数组来源。',
      example: 'iterator_selector = ["start", "items"]'
    },
    {
      key: 'subgraph',
      required: true,
      summary: '子图定义，使用 { nodes = [], edges = [] } 结构。',
      example:
        'subgraph = { nodes = [{ id = "child_end", type = "end", title = "结束", outputs = [{ variable_selector = ["item"] }] }], edges = [] }'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "loop_items"',
      'type = "iter"',
      'title = "逐项处理"',
      'iterator_selector = ["start", "items"]',
      'output_selector = ["child_end", "result"]',
      'flatten_output = true',
      'subgraph = { nodes = [{ id = "child_end", type = "end", title = "结束", outputs = [{ variable_selector = ["item"] }] }], edges = [] }'
    ].join('\n')
  ]
}
