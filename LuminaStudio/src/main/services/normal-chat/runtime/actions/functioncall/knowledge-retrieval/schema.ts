export const knowledgeRetrievalActionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    knowledgeBaseId: {
      type: 'number',
      description: '知识库 id。'
    },
    tableName: {
      type: 'string',
      description: '向量分块表名，例如 emb_xxx_chunks。'
    },
    queryText: {
      type: 'string',
      description: '检索文本。'
    },
    fileKey: {
      type: 'string',
      description: '可选的单文件范围。'
    },
    fileKeys: {
      type: 'array',
      description: '可选的多文件范围，不能是空数组。',
      items: { type: 'string' },
      minItems: 1
    },
    k: {
      type: 'number',
      minimum: 1,
      description: '可选的召回数量。'
    },
    ef: {
      type: 'number',
      minimum: 1,
      description: '可选的搜索 ef。'
    },
    rerankModelId: {
      type: 'string',
      description: '可选的重排模型 id。'
    },
    rerankTopN: {
      type: 'number',
      minimum: 1,
      description: '可选的重排 topN。'
    }
  },
  required: ['knowledgeBaseId', 'tableName', 'queryText']
} satisfies Record<string, unknown>
