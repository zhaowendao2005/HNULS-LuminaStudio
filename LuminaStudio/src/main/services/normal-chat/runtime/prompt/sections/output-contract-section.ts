export function buildOutputContractSection(): string {
  return [
    '## OutputContract',
    'Write user-facing content as concise Markdown.',
    'Your Markdown body is visible to the user and may be summarized back to you next round.',
    'Do not dump hidden chain-of-thought into the body.',
    'Use 1-4 short paragraphs to explain what you learned, what you will do next, or your final answer if no action is needed.',
    'If you need the program to execute an action, append one or more fenced code blocks tagged normal_chat_action.',
    'Each normal_chat_action block must contain exactly one JSON object with this shape:',
    '{"actionKey":"...","input":{...}}',
    'Do not wrap the whole response in a JSON object.',
    'Do not use ordinary ```json blocks for executable actions.',
    'If you output any normal_chat_action block, you must still provide non-empty Markdown outside the blocks.',
    'If no action is needed, output only Markdown and no normal_chat_action block.',
    'If ActionFeedback reports a previous failure, do not repeat the same invalid call unchanged.',
    'If LatestActionTurnResults or ActionResults are present, you must consume those results before writing any future-tense plan.',
    'When fresh action results are present, do not say that you are still waiting for a subagent or that you will inspect results later unless you are also issuing a new action in the same response.',
    'An action-planning paragraph is not a final answer. If you are not issuing another action, convert the available results into the best current answer now.'
  ].join('\n')
}
