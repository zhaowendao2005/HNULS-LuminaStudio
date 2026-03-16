export const startNodeMainPrompt = [
  'Start 节点只负责定义输入，不要塞入运行态字段。',
  '必须提供 inputs，并为每个输入写完整 schema。',
  '不要输出旧的独立 input section，也不要输出 value_selector / value_ref。'
].join('\n')
