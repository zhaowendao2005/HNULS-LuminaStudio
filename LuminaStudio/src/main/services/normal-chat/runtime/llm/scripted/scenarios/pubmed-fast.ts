import type { NormalChatScriptRoundInput } from '../../model-adapter.interface'

export function buildPubmedFastEnvelope(
  input: NormalChatScriptRoundInput
): Record<string, unknown> {
  if (input.roundIndex === 1) {
    return {
      api_meta_md: '脚本桩：fast 模式首轮直接具备 pubmed-search 的完整规格。',
      reply_md: '我会先按不同检索方向并行调用 PubMed，再基于结果整合总结。',
      wants_action: true,
      action_calls: [
        {
          actionKey: 'functioncall.pubmed_search',
          input: {
            query: input.executionSnapshot.request.input
          }
        },
        {
          actionKey: 'functioncall.pubmed_search',
          input: {
            query: `${input.executionSnapshot.request.input} mechanism OR pathway`
          }
        }
      ]
    }
  }

  return {
    api_meta_md: '脚本桩：fast 模式第二轮整理 PubMed 结果。',
    reply_md: '我已经根据 PubMed 检索到的资料整理出结论，下面给出总结回答。',
    wants_action: false,
    action_calls: []
  }
}
