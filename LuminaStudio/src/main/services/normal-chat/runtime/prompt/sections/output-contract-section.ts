export function buildOutputContractSection(): string {
  return [
    '## OutputContract',
    'Write the user-facing content as normal Markdown.',
    'If you need the program to execute an action, append one or more fenced code blocks tagged normal_chat_action.',
    'Each normal_chat_action block must contain exactly one JSON object with this shape:',
    '{"actionKey":"...","input":{...}}',
    'Do not wrap the whole response in a JSON object.',
    'Do not use ordinary ```json blocks for executable actions.',
    'If you output any normal_chat_action block, you must still provide non-empty Markdown outside the blocks to explain your plan or reasoning summary.',
    'If no action is needed, output only Markdown and no normal_chat_action block.'
  ].join('\n')
}
