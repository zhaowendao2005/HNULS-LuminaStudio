import type { NormalChatScriptRoundInput } from '../../model-adapter.interface'

export function buildPubmedSlowEnvelope(
  input: NormalChatScriptRoundInput
): Record<string, unknown> {
  if (input.roundIndex === 1) {
    return {
      apiMetaMd: '脚本桩：slow 模式首轮只知道 pubmed-search 的存在，需要先拉取规格。',
      replyMd: '我先查询 pubmed-search 的完整调用规格，确认字段约束后再检索文献。',
      wantsAction: true,
      actionCalls: [
        {
          actionKey: 'system.get_action_spec',
          input: {
            action_key: 'functioncall.pubmed_search'
          }
        }
      ]
    }
  }

  if (input.roundIndex === 2) {
    return {
      apiMetaMd: '脚本桩：第二轮已经拿到 pubmed-search 的 schema 和 prompt。',
      replyMd: '我会按照刚加载的规格执行 PubMed 检索，收集文献证据。',
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

  if (input.roundIndex === 3) {
    return {
      apiMetaMd: '脚本桩：第三轮触发 subagent 专项研究。',
      replyMd: '我会派发一个 subagent 专项补充检索与总结，然后整合最终答案。',
      wantsAction: true,
      actionCalls: [
        {
          actionKey: 'system.dispatch_sub_agent',
          input: {
            goal: `专项补充检索并总结：${input.question}`,
            enabled_action_keys: ['functioncall.pubmed_search'],
            pubmed_mode: 'fast',
            max_react_steps: 2
          }
        }
      ]
    }
  }

  return {
    apiMetaMd: '脚本桩：第四轮整合 get-action-spec、pubmed-search 和 subagent 结果。',
    replyMd: '我已经整合了文献检索和子研究结果，下面给出当前阶段的汇总回答。',
    wantsAction: false,
    actionCalls: []
  }
}
