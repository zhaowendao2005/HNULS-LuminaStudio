import type { PaperRetrievalSearchResult } from '@preload/types'
import type { PubmedSearchArgs } from './index'
import type { NormalChatFunctioncallExecuteContext } from '../../contracts'

interface ExecutePubmedSearchDependencies {
  paperRetrievalService: {
    search(request: {
      provider_id: 'pubmed'
      api_key_ref_id: null
      provider_options: {
        query: string
        limit: number
        sort: 'relevance' | 'pub_date'
        start_date: string | null
        end_date: string | null
      }
    }): Promise<PaperRetrievalSearchResult>
  }
}

export async function executePubmedSearch(
  args: PubmedSearchArgs,
  context: NormalChatFunctioncallExecuteContext,
  dependencies: ExecutePubmedSearchDependencies
): Promise<PaperRetrievalSearchResult> {
  if (context.signal.aborted) {
    throw new Error('PubMed 检索已中止')
  }

  const query = args.query.trim()
  if (!query) {
    throw new Error('PubMed 检索词不能为空')
  }

  context.logger.info('Normal Chat pubmed helper executing', {
    requestId: context.requestId,
    topicId: context.topicId,
    agentId: context.agentId,
    depth: context.depth,
    query,
    topK: args.topK,
    sort: args.sort
  })

  return dependencies.paperRetrievalService.search({
    provider_id: 'pubmed',
    api_key_ref_id: null,
    provider_options: {
      query,
      limit: args.topK,
      sort: args.sort,
      start_date: args.startDate ?? null,
      end_date: args.endDate ?? null
    }
  })
}
