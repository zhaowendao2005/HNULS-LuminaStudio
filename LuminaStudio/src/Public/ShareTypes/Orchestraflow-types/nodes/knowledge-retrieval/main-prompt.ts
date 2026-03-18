export const knowledgeRetrievalNodeMainPrompt = [
  'knowledge-retrieval 节点必须提供 query。',
  'scopes 至少应配置一个 scope；不要手写 output.variables。',
  '输出主变量固定为 result，同时显式暴露 query / total_scopes / total_hits / partial_failure / items。'
].join('\n')
