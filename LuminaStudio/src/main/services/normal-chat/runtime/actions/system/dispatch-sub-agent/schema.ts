export const dispatchSubAgentActionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    goal: {
      type: 'string',
      description: '交给 subagent 的明确研究目标。'
    },
    enabled_action_keys: {
      type: 'array',
      items: { type: 'string' },
      description: '允许 subagent 使用的非 system action key 列表。'
    },
    pubmed_mode: {
      type: 'string',
      enum: ['fast', 'slow'],
      description: 'subagent 内的 pubmed 装载模式。'
    },
    max_react_steps: {
      type: 'number',
      minimum: 1,
      description: 'subagent 最多可执行多少轮 ReAct。'
    }
  },
  required: ['goal', 'enabled_action_keys', 'pubmed_mode', 'max_react_steps']
} satisfies Record<string, unknown>
