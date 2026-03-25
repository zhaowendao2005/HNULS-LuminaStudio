import type { NormalChatGraphHelperBinding } from '../../../contracts'

export function getBaseChatAgentHelperBindings(): NormalChatGraphHelperBinding[] {
  return [
    {
      helperId: 'pubmed-search',
      descriptionOverlay:
        '当前 base-chat-agent 默认把它当成“需要外部论文证据时优先调用的检索能力”。',
      schemaOverlay:
        '如果用户是在中文语境下提问，仍然优先把 query 改写成适合 PubMed 的英文学术检索词。',
      progressiveOverlay:
        '如果已经拿到足够代表性的论文，就不要重复检索同一个 query，优先直接进入最终回答。'
    }
  ]
}
