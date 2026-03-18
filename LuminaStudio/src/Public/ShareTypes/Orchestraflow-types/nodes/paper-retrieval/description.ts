import type { OFNodeAuthoringDescription } from '../../node-definition'

export const paperRetrievalNodeDescription: OFNodeAuthoringDescription = {
  summary: '按 provider 检索论文条目，并输出标准化论文结果。',
  capabilitySummary:
    '根据 query 与 provider 拉取论文结果，统一暴露 query / provider / total_found / returned_count / items / latency_ms / result。',
  boundariesZh: [
    '不负责知识库检索。',
    '不负责模型总结与写作。',
    '不直接依赖 utility/langchain-client 实现。'
  ],
  inputDependencies: ['query', 'provider', '可选 author / year_from / year_to / limit'],
  outputArtifacts: [
    'query',
    'provider',
    'total_found',
    'returned_count',
    'items',
    'latency_ms',
    'result'
  ],
  compositionHints: ['适合接 llm 节点做论文总结。', '如果需要筛选，可在下游使用 items 或 result。'],
  notes: ['result 是完整标准化对象；items 为标准化论文列表。']
}
