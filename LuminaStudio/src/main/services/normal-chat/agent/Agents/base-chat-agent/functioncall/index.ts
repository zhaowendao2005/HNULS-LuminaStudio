import type { PaperRetrievalService } from '../../../../../paper-retrieval'
import type { NormalChatAgentToolExecuteContext } from '../../../contracts'
import { executePubmedSearch, type PubmedSearchExecutionResult } from './pubmed-search/execute'
import type { PubmedSearchArgs } from './pubmed-search/schema'

export { executePubmedSearch } from './pubmed-search/execute'
export type { PubmedSearchExecutionResult } from './pubmed-search/execute'
export type { PubmedSearchArgs } from './pubmed-search/schema'

export interface BaseChatAgentFunctioncallDependencies {
  paperRetrievalService: PaperRetrievalService
}

export interface BaseChatAgentFunctioncallSuite {
  pubmedSearch(
    args: PubmedSearchArgs,
    context: NormalChatAgentToolExecuteContext
  ): Promise<PubmedSearchExecutionResult>
}

interface BaseChatAgentToolRuntimeContext extends NormalChatAgentToolExecuteContext {
  paperRetrievalService: PaperRetrievalService
}

export type BaseChatAgentPubmedSearchContext = BaseChatAgentToolRuntimeContext

export function createBaseChatAgentFunctioncallSuite(
  dependencies: BaseChatAgentFunctioncallDependencies
): BaseChatAgentFunctioncallSuite {
  return {
    pubmedSearch(args, context) {
      return executePubmedSearch(args, {
        signal: context.signal,
        trace: context.trace,
        runContext: context.runContext,
        modelContext: context.modelContext,
        logger: context.logger,
        paperRetrievalService: dependencies.paperRetrievalService
      })
    }
  }
}
