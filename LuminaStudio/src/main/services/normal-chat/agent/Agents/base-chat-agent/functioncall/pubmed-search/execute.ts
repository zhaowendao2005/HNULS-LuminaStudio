import type { PaperRetrievalSearchRequest, PaperRetrievalSearchResult } from '@preload/types'
import type {
  NormalChatAgentToolExecuteContext,
  NormalChatAgentToolExecuteResult
} from '../../../../contracts'
import type { PubmedSearchArgs } from './schema'

export type PubmedSearchExecutionResult =
  NormalChatAgentToolExecuteResult & PaperRetrievalSearchResult

interface PubmedSearchRuntimeContext extends NormalChatAgentToolExecuteContext {
  paperRetrievalService: {
    search(request: PaperRetrievalSearchRequest): Promise<PaperRetrievalSearchResult>
  }
}

export async function executePubmedSearch(
  args: PubmedSearchArgs,
  ctx: PubmedSearchRuntimeContext
): Promise<PubmedSearchExecutionResult> {
  if (ctx.signal.aborted) {
    throw new Error('PubMed 检索已中止')
  }

  const query = args.query.trim()
  if (!query) {
    throw new Error('PubMed 检索词不能为空')
  }

  // 这里只调用主进程已经存在的 paperRetrieval 服务，不自己再造一套检索实现。
  ctx.trace.record({
    type: 'tool-start',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    toolName: 'pubmed-search',
    message: `开始执行 PubMed 检索：${query}`
  })

  ctx.logger.info('Executing PubMed search through paperRetrieval service', {
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    query,
    topK: args.topK ?? 5,
    sort: args.sort ?? 'relevance'
  })

  const result = await ctx.paperRetrievalService.search({
    provider_id: 'pubmed',
    api_key_ref_id: null,
    provider_options: {
      query,
      limit: args.topK ?? 5,
      sort: args.sort ?? 'relevance',
      start_date: args.startDate ?? null,
      end_date: args.endDate ?? null
    }
  })

  const output = JSON.stringify(result)

  ctx.trace.record({
    type: 'tool-result',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    toolName: 'pubmed-search',
    output,
    message: 'PubMed 检索完成'
  })

  return {
    output,
    ...result
  }
}
