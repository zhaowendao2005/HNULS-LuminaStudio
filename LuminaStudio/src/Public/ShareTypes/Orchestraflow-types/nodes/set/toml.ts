import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const variableAssignNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'rules'],
  optionalFields: ['description'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "shape_output"' },
    { key: 'type', required: true, summary: '固定为 set。', example: 'type = "set"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "整理输出"' },
    {
      key: 'rules',
      required: true,
      summary: '赋值规则列表。',
      example:
        'rules = [{ target_variable = "final_summary", source = { mode = "variable", ref = { selector = ["summarize", "summary"] } }, target_type = "string" }]'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "shape_output"',
      'type = "set"',
      'title = "整理输出"',
      'rules = [{ target_variable = "final_summary", source = { mode = "variable", ref = { selector = ["summarize", "summary"] } }, target_type = "string" }]'
    ].join('\n')
  ]
}
