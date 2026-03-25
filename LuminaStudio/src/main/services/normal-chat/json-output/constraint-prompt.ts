export interface JsonContractPromptOptions {
  contractName: string
  schemaPrompt: string
  extraRules?: string[]
}

export function buildJsonContractPrompt(options: JsonContractPromptOptions): string {
  const extraRules = options.extraRules ?? []

  return [
    `你现在需要输出 ${options.contractName}。`,
    '你必须只返回一个 JSON 对象。',
    '不要输出 Markdown，不要输出代码块，不要输出多余解释。',
    '如果字段不适用，返回 null 或空数组，不要擅自省略必要字段。',
    '',
    '请严格遵守下面这段 JSONC 契约说明：',
    options.schemaPrompt,
    ...(extraRules.length > 0 ? ['', '附加规则：', ...extraRules.map((rule) => `- ${rule}`)] : [])
  ].join('\n')
}
