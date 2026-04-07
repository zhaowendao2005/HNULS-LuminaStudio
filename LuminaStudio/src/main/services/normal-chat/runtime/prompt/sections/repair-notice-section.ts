export function buildRepairNoticeSection(errorMessage: string | null | undefined): string {
  if (!errorMessage) {
    return ''
  }

  return [
    '## RepairNotice',
    'The previous round could not be executed by the runtime.',
    `Reason: ${errorMessage}`,
    '',
    'Repair the structure instead of restarting the task.',
    'Preserve any still-valid Markdown answer.',
    'If actions are needed, emit them only as normal_chat_action blocks with valid actionKey and schema-conforming input.'
  ].join('\n')
}
