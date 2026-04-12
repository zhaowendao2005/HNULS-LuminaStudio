import type { KnowledgeRetrievalService } from '@main/services/knowledge-retrieval'
import type { RetrievalHit } from '@shared/knowledge-database-api.types'

export interface NormalChatKnowledgeRetrievalInput {
  knowledgeBaseId: number
  tableName: string
  queryText: string
  fileKey?: string
  fileKeys?: string[]
  k?: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
}

export class NormalChatKnowledgeRetrievalAdapter {
  constructor(private readonly knowledgeRetrievalService: KnowledgeRetrievalService) {}

  async search(input: NormalChatKnowledgeRetrievalInput): Promise<RetrievalHit[]> {
    const result = await this.knowledgeRetrievalService.search(input)
    return result.hits
  }
}
