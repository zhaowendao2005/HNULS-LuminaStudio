import type { PaperRetrievalService } from '../../../../../paper-retrieval'
import type {
  NormalChatAgentExecutionToolCall,
  NormalChatAgentToolExecuteContext
} from '../../../contracts'
import { executePubmedSearch, type PubmedSearchExecutionResult } from './pubmed-search/execute'
import type { PubmedSearchArgs } from './pubmed-search/schema'

export { executePubmedSearch } from './pubmed-search/execute'
export type { PubmedSearchExecutionResult } from './pubmed-search/execute'
export type { PubmedSearchArgs } from './pubmed-search/schema'

export interface BaseChatAgentFunctioncallDependencies {
  paperRetrievalService: PaperRetrievalService
}

export interface BaseChatAgentFunctioncallSuite {
  executeToolCall(
    call: NormalChatAgentExecutionToolCall,
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
    executeToolCall(call, context) {
      switch (call.toolName) {
        case 'pubmed-search':
          return executePubmedSearch(call.input as PubmedSearchArgs, {
            signal: context.signal,
            trace: context.trace,
            runContext: context.runContext,
            modelContext: context.modelContext,
            logger: context.logger,
            paperRetrievalService: dependencies.paperRetrievalService,
            callId: context.callId,
            roundIndex: context.roundIndex,
            batchIndex: context.batchIndex,
            parallelIndex: context.parallelIndex,
            depth: context.depth,
            decisionReason: context.decisionReason
          })
        default:
          throw new Error(`Unsupported tool call: ${String(call.toolName)}`)
      }
    }
  }
}
