import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const ifNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'cases'],
  optionalFields: ['description', 'elseLabel'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "gate"' },
    { key: 'type', required: true, summary: '固定为 if。', example: 'type = "if"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "条件分流"' },
    {
      key: 'cases',
      required: true,
      summary: '分支数组，每项至少包含 label 与 conditions。',
      example:
        'cases = [{ label = "高分", conditions = [{ variable_selector = ["summarize", "score"], operator = "gte", value = 8 }] }]'
    },
    {
      key: 'elseLabel',
      required: false,
      summary: '可选的 else 标签。',
      example: 'elseLabel = "其他情况"'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "gate"',
      'type = "if"',
      'title = "条件分流"',
      'cases = [{ label = "高分", conditions = [{ variable_selector = ["summarize", "score"], operator = "gte", value = 8 }] }]',
      'elseLabel = "其他情况"'
    ].join('\n')
  ]
}
