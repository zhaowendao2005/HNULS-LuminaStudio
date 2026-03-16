export const loopNodeMainPrompt = [
  'Loop 节点必须声明循环次数来源和 subgraph。',
  '局部循环变量写在 loop_variables，不要写内部 start_node_id。',
  '若需要提前终止，请写 break_conditions。'
].join('\n')
