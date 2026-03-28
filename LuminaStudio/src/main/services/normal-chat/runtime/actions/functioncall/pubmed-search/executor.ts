import type { NormalChatPubmedSearchOutput } from '../../shared/action.types'
import {
  NormalChatPubmedSearchAdapter,
  type NormalChatPubmedSearchInput
} from './paper-retrieval-adapter'

export class NormalChatPubmedSearchExecutor {
  constructor(private readonly adapter: NormalChatPubmedSearchAdapter) {}

  async execute(input: NormalChatPubmedSearchInput): Promise<NormalChatPubmedSearchOutput> {
    const result = await this.adapter.search(input)
    return { result }
  }
}
