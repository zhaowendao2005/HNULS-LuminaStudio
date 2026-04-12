import type { NormalChatKnowledgeRetrievalOutput } from '../../shared/action.types'
import {
  NormalChatKnowledgeRetrievalAdapter,
  type NormalChatKnowledgeRetrievalInput
} from './adapter'

export class NormalChatKnowledgeRetrievalExecutor {
  constructor(private readonly adapter: NormalChatKnowledgeRetrievalAdapter) {}

  async execute(input: NormalChatKnowledgeRetrievalInput): Promise<NormalChatKnowledgeRetrievalOutput> {
    const hits = await this.adapter.search(input)
    return { hits }
  }
}
