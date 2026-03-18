import type { OFNodeAuthoringDescription } from '../../node-definition'

export const knowledgeRetrievalNodeDescription: OFNodeAuthoringDescription = {
  summary: '从一个或多个知识 scope 中检索文本片段，并输出标准化知识结果。',
  capabilitySummary:
    '根据 query 执行知识检索，统一暴露 query / total_scopes / total_hits / partial_failure / items / result。',
  boundariesZh: [
    '不负责模型推理与回答生成。',
    '不直接依赖 utility/langchain-client 实现。',
    '不手写 runtime output.variables。'
  ],
  inputDependencies: ['query', 'scopes', '可选 provider / top_k / rerank_top_n'],
  outputArtifacts: ['query', 'total_scopes', 'total_hits', 'partial_failure', 'items', 'result'],
  compositionHints: [
    '常与 start / llm / end 组合。',
    '如果后续还要总结，可直接消费 result 或 items。'
  ],
  notes: ['result 是完整标准化对象；其余字段为显式平铺变量。']
}
