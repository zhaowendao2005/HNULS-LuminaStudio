import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const endNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'outputs'],
  optionalFields: ['description'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "end"' },
    { key: 'type', required: true, summary: '固定为 end。', example: 'type = "end"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "结束"' },
    {
      key: 'outputs',
      required: true,
      summary: '最终输出变量列表。',
      example:
        'outputs = [{ variable = "summary", variable_selector = ["shape_output", "final_summary"] }]'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "end"',
      'type = "end"',
      'title = "结束"',
      'outputs = [{ variable = "summary", variable_selector = ["shape_output", "final_summary"] }]'
    ].join('\n')
  ]
}
