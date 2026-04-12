import type { NormalChatActionDescriptor } from '../../shared/action.types'

export const kgRetrievalActionDescriptor: NormalChatActionDescriptor = {
  key: 'functioncall.kg_retrieval',
  kind: 'functioncall',
  title: 'KG Retrieval',
  description: '当问题需要从本地知识图谱中检索实体、关系和相关 chunk 时，调用知识图谱检索。',
  defaultMode: 'slow'
}
