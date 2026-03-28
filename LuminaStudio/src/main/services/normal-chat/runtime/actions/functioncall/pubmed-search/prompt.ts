export const pubmedSearchActionPrompt = [
  'query 只能填写真正要检索的论文主题，不能塞自然语言计划、解释或多段文本。',
  'top_k 只能是 1-20 的整数；如果你只需要几条高质量结果，不要默认拉满 20。',
  'sort 只能是 relevance 或 pub_date，二选一。',
  'date_from/date_to 要么是 YYYY-MM-DD，要么显式写 null。',
  'api_key_ref_id 只能写现有系统中的 key 引用；没有就写 null。',
  '如果问题不是文献检索，就不要硬调用 pubmed-search。'
].join('\n')
