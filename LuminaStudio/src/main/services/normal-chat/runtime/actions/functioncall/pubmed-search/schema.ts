export const pubmedSearchActionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: {
      type: 'string',
      description: '检索主题，只允许填写真实检索词。'
    },
    top_k: {
      type: 'number',
      minimum: 1,
      maximum: 20,
      description: '最多返回多少篇论文。'
    },
    sort: {
      type: 'string',
      enum: ['relevance', 'pub_date'],
      description: 'PubMed 排序策略。'
    },
    date_from: {
      type: 'string',
      description: '开始日期，格式 YYYY-MM-DD。',
      nullable: true
    },
    date_to: {
      type: 'string',
      description: '结束日期，格式 YYYY-MM-DD。',
      nullable: true
    },
    api_key_ref_id: {
      type: 'string',
      description: '可选的 PubMed API key 引用。',
      nullable: true
    }
  },
  required: ['query', 'top_k', 'sort', 'date_from', 'date_to', 'api_key_ref_id']
} satisfies Record<string, unknown>
