import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const startNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'inputs'],
  optionalFields: ['description'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "start"' },
    { key: 'type', required: true, summary: '固定为 start。', example: 'type = "start"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "开始"' },
    {
      key: 'inputs',
      required: true,
      summary: '输入变量列表，使用内联 TOML 数组对象表达 schema。',
      example:
        'inputs = [{ variable = "user_query", schema = { type = "string", default = "请总结下面内容" } }]'
    },
    {
      key: 'description',
      required: false,
      summary: '给作者看的补充说明。',
      example: 'description = "接收用户输入"'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "start"',
      'type = "start"',
      'title = "开始"',
      'description = "接收用户输入"',
      'inputs = [{ variable = "user_query", schema = { type = "string", default = "请总结下面内容" } }]'
    ].join('\n')
  ]
}
