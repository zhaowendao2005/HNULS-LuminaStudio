import type { NormalChatActionDescriptor } from '../../shared/action.types'

export const knowledgeRetrievalActionDescriptor: NormalChatActionDescriptor = {
  key: 'functioncall.knowledge_retrieval',
  kind: 'functioncall',
  title: 'Knowledge Retrieval',
  description: '当问题需要从本地知识库向量表中检索文档分块时，调用知识库检索。',
  defaultMode: 'slow'
}
