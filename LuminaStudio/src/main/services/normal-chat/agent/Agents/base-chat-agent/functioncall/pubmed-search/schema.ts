export interface PubmedSearchArgs {
  query: string
  topK?: number
  sort?: 'relevance' | 'pub_date'
  startDate?: string | null
  endDate?: string | null
}
