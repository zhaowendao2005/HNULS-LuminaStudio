export interface KnowledgeSearchArgs {
  query: string
  topK?: number
}

export interface KnowledgeSearchResultItem {
  id: string
  title: string
  snippet: string
}

export interface KnowledgeSearchResult {
  items: KnowledgeSearchResultItem[]
}
