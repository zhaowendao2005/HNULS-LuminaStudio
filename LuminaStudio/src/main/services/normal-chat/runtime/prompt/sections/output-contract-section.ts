export function buildOutputContractSection(): string {
  return [
    '## OutputContract',
    'Return a JSON envelope with these fields only:',
    '- api_meta_md: markdown status/thinking text',
    '- reply_md: markdown reply for the user or current plan, must not be empty',
    '- wants_action: boolean',
    '- action_calls: array of { actionKey, input }',
    'If wants_action is false, action_calls must be an empty array.'
  ].join('\n')
}
