import type { PaperRetrievalService } from '@main/services/paper-retrieval'
import type { PaperRetrievalSearchResult } from '@preload/types'

export interface NormalChatPubmedSearchInput {
  query: string
  top_k: number
  sort: 'relevance' | 'pub_date'
  date_from: string | null
  date_to: string | null
  api_key_ref_id: string | null
}

export class NormalChatPubmedSearchAdapter {
  constructor(private readonly paperRetrievalService: PaperRetrievalService) {}

  async search(input: NormalChatPubmedSearchInput): Promise<PaperRetrievalSearchResult> {
    return this.paperRetrievalService.search({
      provider_id: 'pubmed',
      api_key_ref_id: input.api_key_ref_id,
      provider_options: {
        query: input.query,
        limit: input.top_k,
        sort: input.sort,
        start_date: input.date_from,
        end_date: input.date_to
      }
    })
  }
}
