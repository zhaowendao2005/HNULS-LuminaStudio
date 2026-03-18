export const paperRetrievalNodeMainPrompt = [
  'paper-retrieval 节点必须提供 query 与 provider。',
  '不要手写 output.variables；共享定义会自动生成。',
  '输出主变量固定为 result，同时显式暴露 query / provider / total_found / returned_count / items / latency_ms。'
].join('\n')
