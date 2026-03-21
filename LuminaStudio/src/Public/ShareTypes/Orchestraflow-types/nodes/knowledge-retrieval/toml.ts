import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const knowledgeRetrievalNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'query', 'scopes'],
  optionalFields: [
    'description',
    'provider',
    'top_k',
    'rerank_model_id',
    'rerank_top_n',
    'include_metadata'
  ],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "knowledge_lookup"' },
    {
      key: 'type',
      required: true,
      summary: '固定为 knowledge-retrieval。',
      example: 'type = "knowledge-retrieval"'
    },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "知识检索"' },
    {
      key: 'query',
      required: true,
      summary: '检索查询词。',
      example: 'query = "肝癌免疫治疗最新进展"'
    },
    {
      key: 'scopes',
      required: true,
      summary: '检索 scope 列表。',
      example: 'scopes = [{ scope_id = "kb_liver", knowledge_base_id = 1, table_name = "chunks" }]'
    },
    {
      key: 'provider',
      required: false,
      summary: '可选 provider。',
      example: 'provider = "knowledge-base"'
    },
    { key: 'top_k', required: false, summary: '返回条数上限。', example: 'top_k = 5' },
    {
      key: 'rerank_model_id',
      required: false,
      summary: '可选重排模型 id。启用 rerank 时建议显式填写。',
      example: 'rerank_model_id = "example-rerank-model"'
    },
    {
      key: 'rerank_top_n',
      required: false,
      summary: '重排后最终保留数量；允许小于 top_k。',
      example: 'rerank_top_n = 3'
    },
    {
      key: 'include_metadata',
      required: false,
      summary: '是否保留 metadata。',
      example: 'include_metadata = true'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "knowledge_lookup"',
      'type = "knowledge-retrieval"',
      'title = "知识检索"',
      'query = "肝癌免疫治疗最新进展"',
      'provider = "knowledge-base"',
      'top_k = 5',
      'rerank_model_id = "example-rerank-model"',
      'rerank_top_n = 3',
      'include_metadata = true',
      'scopes = [{ scope_id = "kb_liver", knowledge_base_id = 1, table_name = "chunks" }]'
    ].join('\n')
  ],
  suggestions: [
    {
      code: 'required-field-missing',
      nodeType: 'knowledge-retrieval',
      message: 'knowledge-retrieval 节点至少需要 query 与 scopes，且不要手写 output.variables。'
    }
  ]
}
