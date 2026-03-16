export const iterationNodeMainPrompt = [
  'Iteration 节点必须声明 iterator_selector，并提供 subgraph。',
  '不要手写 iteration-start 节点；系统会在编译时补齐。',
  '如果要控制结果聚合，请写 output_selector、flatten_output 等作者态字段。'
].join('\n')
