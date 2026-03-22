import type {
  NormalChatAgentToolExecuteContext,
  NormalChatAgentToolExecuteResult
} from '../../../../contracts'
import type { KnowledgeSearchArgs, KnowledgeSearchResult } from './schema'

export async function executeKnowledgeSearch(
  args: KnowledgeSearchArgs,
  ctx: NormalChatAgentToolExecuteContext
): Promise<NormalChatAgentToolExecuteResult & KnowledgeSearchResult> {
  if (ctx.signal.aborted) {
    throw new Error('知识搜索已中止')
  }

  // 第一版先返回空结果，后续再接真实知识检索实现。
  ctx.trace.record({
    type: 'tool-start',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    toolName: 'knowledge-search',
    message: `开始执行知识搜索：${args.query}`
  })

  const result: KnowledgeSearchResult = { items: [] }
  const output = JSON.stringify(result)

  ctx.trace.record({
    type: 'tool-result',
    requestId: ctx.runContext.requestId,
    topicId: ctx.runContext.topicId,
    toolName: 'knowledge-search',
    output,
    message: '知识搜索完成'
  })

  return {
    output,
    ...result
  }
}
