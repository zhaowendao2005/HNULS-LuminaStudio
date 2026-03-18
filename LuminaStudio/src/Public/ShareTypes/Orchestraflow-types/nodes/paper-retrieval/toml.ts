import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const paperRetrievalNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'query', 'provider'],
  optionalFields: ['description', 'limit', 'author', 'year_from', 'year_to'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "paper_search"' },
    {
      key: 'type',
      required: true,
      summary: '固定为 paper-retrieval。',
      example: 'type = "paper-retrieval"'
    },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "论文检索"' },
    {
      key: 'query',
      required: true,
      summary: '检索查询词。',
      example: 'query = "hepatocellular carcinoma immunotherapy"'
    },
    { key: 'provider', required: true, summary: '论文 provider。', example: 'provider = "pubmed"' },
    { key: 'limit', required: false, summary: '返回条数上限。', example: 'limit = 5' },
    { key: 'author', required: false, summary: '作者过滤。', example: 'author = "Smith"' },
    { key: 'year_from', required: false, summary: '起始年份。', example: 'year_from = 2020' },
    { key: 'year_to', required: false, summary: '结束年份。', example: 'year_to = 2025' }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "paper_search"',
      'type = "paper-retrieval"',
      'title = "论文检索"',
      'query = "hepatocellular carcinoma immunotherapy"',
      'provider = "pubmed"',
      'limit = 5',
      'year_from = 2020',
      'year_to = 2025'
    ].join('\n')
  ],
  suggestions: [
    {
      code: 'required-field-missing',
      nodeType: 'paper-retrieval',
      message: 'paper-retrieval 节点至少需要 query 与 provider，且不要手写 output.variables。'
    }
  ]
}
