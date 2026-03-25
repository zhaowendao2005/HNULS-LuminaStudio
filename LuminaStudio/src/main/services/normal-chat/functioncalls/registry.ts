import { createPubmedSearchHelper } from './helpers/pubmed-search'
import type {
  NormalChatFunctioncallHelper,
  NormalChatFunctioncallRegistry,
  NormalChatFunctioncallRegistryDependencies
} from './contracts'

export class NormalChatHelperRegistry implements NormalChatFunctioncallRegistry {
  private readonly helpers: NormalChatFunctioncallHelper[]

  constructor(dependencies: NormalChatFunctioncallRegistryDependencies) {
    this.helpers = [createPubmedSearchHelper(dependencies)]
  }

  listHelpers(): NormalChatFunctioncallHelper[] {
    return [...this.helpers]
  }

  getHelper(helperId: string): NormalChatFunctioncallHelper | null {
    return this.helpers.find((helper) => helper.id === helperId) ?? null
  }

  requireHelper(helperId: string): NormalChatFunctioncallHelper {
    const helper = this.getHelper(helperId)
    if (!helper) {
      throw new Error(`Unknown normal-chat helper: ${helperId}`)
    }

    if (!helper.description || !helper.schemaPrompt || !helper.progressivePrompt) {
      throw new Error(`Normal-chat helper assets incomplete: ${helperId}`)
    }

    return helper
  }
}

export function createNormalChatHelperLibrary(
  dependencies: NormalChatFunctioncallRegistryDependencies
): NormalChatFunctioncallRegistry {
  return new NormalChatHelperRegistry(dependencies)
}
