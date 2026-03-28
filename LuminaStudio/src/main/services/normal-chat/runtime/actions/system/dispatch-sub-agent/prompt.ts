export const dispatchSubAgentActionPrompt = [
  '只有当当前问题明显需要拆出一个专项研究分支时，才允许派发 subagent。',
  'goal 必须是一个可单独完成的窄任务，不能只是重复主问题。',
  'enabled_action_keys 只能列出当前系统已经提供的非 system action key。',
  '如果主 agent 自己就能完成，不要为了显得复杂而滥用 subagent。',
  'subagent 返回的是总结材料，不是替主 agent 越权直接结束整轮回答。'
].join('\n')
