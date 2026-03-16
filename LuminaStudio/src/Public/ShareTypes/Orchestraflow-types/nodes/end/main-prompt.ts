export const endNodeMainPrompt = [
  'End 节点必须声明 outputs。',
  '每个输出都应引用已有变量，不要重复声明 schema。',
  '不要输出额外 runtime 字段。'
].join('\n')
