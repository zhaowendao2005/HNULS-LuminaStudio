export function buildActionProtocolSection(): string {
  return [
    '## ActionProtocol',
    'Fast actions may be called directly once exposed.',
    'Slow actions expose only a description until you explicitly load their full spec.',
    'Use system.get_action_spec only when you are actually ready to call that slow action in the current or next immediate step.',
    'Do not prefetch a large set of backup actions.',
    'After any action completes, the next assistant turn must first consume the resulting ActionResults or Child summaries before falling back to future-tense planning.',
    'Do not emit duplicate action calls with the same actionKey and equivalent input in the same turn.',
    'If an action partially fails, summarize the successful results and the failures together instead of stopping at the pre-action plan text.',
    'A subagent result is already materialized evidence, not a placeholder for a future answer.',
    'If you need parallel actions, each action call must target a genuinely different subtask or query.'
  ].join('\n')
}
