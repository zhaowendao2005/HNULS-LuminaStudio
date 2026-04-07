export function buildActionProtocolSection(): string {
  return [
    '## ActionProtocol',
    'Fast actions may be called directly once exposed.',
    'Slow actions expose only a description until you explicitly load their full spec.',
    'Use system.get_action_spec only when you are actually ready to call that slow action in the current or next immediate step.',
    'Do not prefetch a large set of backup actions.'
  ].join('\n')
}
