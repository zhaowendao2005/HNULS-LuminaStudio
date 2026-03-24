import type { PaperRetrievalSearchRequest, PaperRetrievalSearchResult } from '@preload/types'
import type {
  NormalChatAgentToolExecuteContext,
  NormalChatAgentToolExecuteResult
} from '../../../../contracts'
import type { PubmedSearchArgs } from './schema'

export type PubmedSearchExecutionResult = NormalChatAgentToolExecuteResult &
  PaperRetrievalSearchResult

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

  const title = 'PubMed 论文检索'
  const input = JSON.stringify(
    {
      query,
      topK: args.topK ?? 5,
      sort: args.sort ?? 'relevance',
      startDate: args.startDate ?? null,
      endDate: args.endDate ?? null,
      roundIndex: ctx.roundIndex,
      batchIndex: ctx.batchIndex,
      parallelIndex: ctx.parallelIndex,
      depth: ctx.depth,
      decisionReason: ctx.decisionReason
    },
    null,
    2
  )

  // 先记录开始和输入，再把真正的检索结果写回 trace，便于前端回放每一次调用。
  ctx.trace.record({
    type: 'functioncall-start',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    roundIndex: ctx.roundIndex,
    batchIndex: ctx.batchIndex,
    parallelIndex: ctx.parallelIndex,
    depth: ctx.depth,
    decisionReason: ctx.decisionReason,
    callId: ctx.callId,
    functionCallName: 'pubmed-search',
    title,
    message: `开始执行 ${title}`
  })
  ctx.trace.record({
    type: 'functioncall-input',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    roundIndex: ctx.roundIndex,
    batchIndex: ctx.batchIndex,
    parallelIndex: ctx.parallelIndex,
    depth: ctx.depth,
    decisionReason: ctx.decisionReason,
    callId: ctx.callId,
    functionCallName: 'pubmed-search',
    title,
    input,
    message: `收到 ${title} 输入`
  })
  ctx.trace.record({
    type: 'tool-start',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    roundIndex: ctx.roundIndex,
    batchIndex: ctx.batchIndex,
    parallelIndex: ctx.parallelIndex,
    depth: ctx.depth,
    decisionReason: ctx.decisionReason,
    toolName: 'pubmed-search',
    message: `开始执行 PubMed 检索：${query}`
  })

  try {
    ctx.logger.info('Executing PubMed search through paperRetrieval service', {
      requestId: ctx.runContext.requestId,
      topicId: ctx.runContext.topicId,
      query,
      topK: args.topK ?? 5,
      sort: args.sort ?? 'relevance',
      roundIndex: ctx.roundIndex,
      batchIndex: ctx.batchIndex,
      parallelIndex: ctx.parallelIndex,
      depth: ctx.depth
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
      type: 'functioncall-output',
      requestId: ctx.runContext.requestId,
      topicId: ctx.runContext.topicId,
      roundIndex: ctx.roundIndex,
      batchIndex: ctx.batchIndex,
      parallelIndex: ctx.parallelIndex,
      depth: ctx.depth,
      decisionReason: ctx.decisionReason,
      callId: ctx.callId,
      functionCallName: 'pubmed-search',
      title,
      output,
      message: `${title} 输出已返回`
    })
    ctx.trace.record({
      type: 'functioncall-finish',
      requestId: ctx.runContext.requestId,
      topicId: ctx.runContext.topicId,
      roundIndex: ctx.roundIndex,
      batchIndex: ctx.batchIndex,
      parallelIndex: ctx.parallelIndex,
      depth: ctx.depth,
      decisionReason: ctx.decisionReason,
      callId: ctx.callId,
      functionCallName: 'pubmed-search',
      title,
      status: 'success',
      message: 'PubMed 检索完成'
    })
    ctx.trace.record({
      type: 'tool-result',
      requestId: ctx.runContext.requestId,
      topicId: ctx.runContext.topicId,
      roundIndex: ctx.roundIndex,
      batchIndex: ctx.batchIndex,
      parallelIndex: ctx.parallelIndex,
      depth: ctx.depth,
      decisionReason: ctx.decisionReason,
      toolName: 'pubmed-search',
      output,
      message: 'PubMed 检索完成'
    })

    return {
      output,
      ...result
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.trace.record({
      type: 'functioncall-error',
      requestId: ctx.runContext.requestId,
      topicId: ctx.runContext.topicId,
      roundIndex: ctx.roundIndex,
      batchIndex: ctx.batchIndex,
      parallelIndex: ctx.parallelIndex,
      depth: ctx.depth,
      decisionReason: ctx.decisionReason,
      callId: ctx.callId,
      functionCallName: 'pubmed-search',
      title,
      error: message,
      message: `${title} 执行失败`
    })
    throw error
  }
}
