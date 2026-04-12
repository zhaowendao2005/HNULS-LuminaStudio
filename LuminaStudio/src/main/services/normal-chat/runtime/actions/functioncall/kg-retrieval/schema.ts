export const kgRetrievalActionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    graphTableBase: {
      type: 'string',
      description: '图谱表基名。'
    },
    query: {
      type: 'string',
      description: '可选的查询文本。'
    },
    mode: {
      type: 'string',
      enum: ['local', 'global', 'hybrid', 'naive'],
      description: '可选的检索模式。'
    },
    highLevelKeywords: {
      type: 'array',
      items: { type: 'string' },
      description: '可选的高层级关键词。'
    },
    lowLevelKeywords: {
      type: 'array',
      items: { type: 'string' },
      description: '可选的低层级关键词。'
    },
    rerank: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        modelId: { type: 'string' },
        topN: { type: 'number', minimum: 1 }
      },
      required: ['enabled']
    }
  },
  required: ['graphTableBase']
} satisfies Record<string, unknown>
