import type { KGRetrievalService } from '@main/services/kg-retrieval/kg-retrieval-service'
import type {
  KGRetrievalSearchRequest,
  KGRetrievalSearchResult
} from '@shared/knowledge-database-api.types'

export type NormalChatKgRetrievalInput = KGRetrievalSearchRequest

export class NormalChatKgRetrievalAdapter {
  constructor(private readonly kgRetrievalService: KGRetrievalService) {}

  async search(input: NormalChatKgRetrievalInput): Promise<KGRetrievalSearchResult> {
    return this.kgRetrievalService.search(input)
  }
}
