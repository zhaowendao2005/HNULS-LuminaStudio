import type { NormalChatKgRetrievalOutput } from '../../shared/action.types'
import { NormalChatKgRetrievalAdapter, type NormalChatKgRetrievalInput } from './adapter'

export class NormalChatKgRetrievalExecutor {
  constructor(private readonly adapter: NormalChatKgRetrievalAdapter) {}

  async execute(input: NormalChatKgRetrievalInput): Promise<NormalChatKgRetrievalOutput> {
    const result = await this.adapter.search(input)
    return { result }
  }
}
