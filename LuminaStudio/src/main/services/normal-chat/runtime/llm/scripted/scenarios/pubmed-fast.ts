import type { NormalChatScriptRoundInput } from '../../model-adapter.interface'

export function buildPubmedFastEnvelope(
  input: NormalChatScriptRoundInput
): Record<string, unknown> {
  if (input.roundIndex === 1) {
    return {
      apiMetaMd: '脚本桩：fast 模式首轮直接具备 pubmed-search 的完整规格。',
      replyMd: '我会先调用 PubMed 检索相关论文，再基于检索结果给出总结。',
      wantsAction: true,
      actionCalls: [
        {
          actionKey: 'functioncall.pubmed_search',
          input: {
            query: input.question,
            top_k: 5,
            sort: 'relevance',
            date_from: null,
            date_to: null,
            api_key_ref_id: null
          }
        }
      ]
    }
  }

  return {
    apiMetaMd: '脚本桩：fast 模式第二轮整理 PubMed 结果。',
    replyMd: '我已经根据 PubMed 检索到的资料整理出结论，下面给出总结回答。',
    wantsAction: false,
    actionCalls: []
  }
}
