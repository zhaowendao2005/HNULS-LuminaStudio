import type { NormalChatActionDescriptor } from '../../shared/action.types'

export const pubmedSearchActionDescriptor: NormalChatActionDescriptor = {
  key: 'functioncall.pubmed_search',
  kind: 'functioncall',
  title: 'PubMed Search',
  description: '当问题属于学术论文、医学文献、研究综述、证据检索时，调用 PubMed 检索外部论文资料。',
  defaultMode: 'slow'
}
