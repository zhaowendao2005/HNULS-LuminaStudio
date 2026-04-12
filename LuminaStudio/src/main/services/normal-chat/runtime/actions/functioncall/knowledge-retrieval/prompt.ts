export const knowledgeRetrievalActionPrompt = [
  '只在需要从本地知识库向量表检索文档分块时调用 knowledge_retrieval。',
  'knowledgeBaseId、tableName、queryText 是必填。tableName 必须是真实可用的 emb_*_chunks 表名，不要臆造。',
  'queryText 只能填写真正的检索文本，不要塞自然语言计划、解释或多段说明。',
  'fileKey 和 fileKeys 只在明确需要缩小到指定文件时填写，否则省略表示整表检索。',
  'fileKeys 不能传空数组。',
  'k、ef、rerankModelId、rerankTopN 都是可选的；除非明确需要控制检索行为，否则直接省略，让服务端使用默认逻辑。',
  '如果不是知识库文档检索，不要调用 knowledge_retrieval。'
].join('\n')
