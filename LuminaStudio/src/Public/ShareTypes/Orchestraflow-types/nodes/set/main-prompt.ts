export const variableAssignNodeMainPrompt = [
  'Set 节点必须提供 rules。',
  '每条规则都要明确 target_variable，以及常量或变量来源。',
  '不要输出 runtime output，系统会根据 rules 自动派生。'
].join('\n')
