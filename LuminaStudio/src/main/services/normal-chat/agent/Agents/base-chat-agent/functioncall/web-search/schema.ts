export interface WebSearchArgs {
  query: string
  topK?: number
}

export interface WebSearchResultItem {
  title: string
  url: string
  snippet: string
}

export interface WebSearchResult {
  items: WebSearchResultItem[]
}
