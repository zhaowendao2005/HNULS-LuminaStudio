export const getActionSpecActionPrompt = [
  '你只能在确实准备调用某个 slow mode action 时使用这个 action。',
  'action_key 必须完全等于系统已暴露的 action key，不能自造、不能模糊匹配。',
  '如果你还没有决定要调用哪个 action，不允许先查询一批备用 action。',
  '同一轮里，如果已经拿到目标 action 的完整 schema 和 prompt，就不要重复查询。'
].join('\n')
