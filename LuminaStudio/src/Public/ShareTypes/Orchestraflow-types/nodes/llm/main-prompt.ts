export const llmNodeMainPrompt = [
  'LLM 节点必须写 model 与 prompt。',
  'model 统一写 provider/model，不要拆成旧内部字段。',
  '如果需要结构化输出，使用 struct 描述 schema，不要输出 runtime 的 structured_output JSON。'
].join('\n')
