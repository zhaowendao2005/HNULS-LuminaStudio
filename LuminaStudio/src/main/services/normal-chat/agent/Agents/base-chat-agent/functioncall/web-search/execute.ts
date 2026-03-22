import type {
  NormalChatAgentToolExecuteContext,
  NormalChatAgentToolExecuteResult
} from '../../../../contracts'
import type { WebSearchArgs, WebSearchResult } from './schema'

export async function executeWebSearch(
  args: WebSearchArgs,
  ctx: NormalChatAgentToolExecuteContext
): Promise<NormalChatAgentToolExecuteResult & WebSearchResult> {
  if (ctx.signal.aborted) {
    throw new Error('网页搜索已中止')
  }

  // 第一版先保留空壳，等真实 web-search 能力接入后再补执行逻辑。
  ctx.trace.record({
    type: 'tool-start',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    toolName: 'web-search',
    message: `开始执行网页搜索：${args.query}`
  })

  const result: WebSearchResult = { items: [] }
  const output = JSON.stringify(result)

  ctx.trace.record({
    type: 'tool-result',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    toolName: 'web-search',
    output,
    message: '网页搜索完成'
  })

  return {
    output,
    ...result
  }
}
