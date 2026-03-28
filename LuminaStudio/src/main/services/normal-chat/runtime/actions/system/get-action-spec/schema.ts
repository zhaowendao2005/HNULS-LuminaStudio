export const getActionSpecActionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action_key: {
      type: 'string',
      description: '要查询规格的 action key。'
    }
  },
  required: ['action_key']
} satisfies Record<string, unknown>
