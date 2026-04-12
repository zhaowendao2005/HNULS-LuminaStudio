export const kgRetrievalActionPrompt = [
  '只在需要从本地知识图谱中检索实体、关系和相关 chunk 时调用 kg_retrieval。',
  'graphTableBase 是必填，必须是真实可用的图谱表基名，不要臆造。',
  'query 不是必填，但 query、highLevelKeywords、lowLevelKeywords 至少要提供一种有效输入。',
  '如果不确定 mode，直接省略，让服务端使用默认模式。',
  'highLevelKeywords 更适合关系和主题层面的召回，lowLevelKeywords 更适合实体和术语层面的召回。',
  '只有明确需要重排且知道可用模型时才启用 rerank.enabled=true；启用时必须同时提供 rerank.modelId。',
  '如果不是图谱检索，不要调用 kg_retrieval。'
].join('\n')
