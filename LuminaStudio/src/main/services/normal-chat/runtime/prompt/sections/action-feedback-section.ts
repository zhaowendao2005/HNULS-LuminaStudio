import type { NormalChatActionFeedback } from '../../agent/memory/assistant-round-memory.types'

export function buildActionFeedbackSection(feedback: NormalChatActionFeedback[]): string {
  const body =
    feedback.length > 0
      ? feedback
          .map((item) => {
            return [
              `### ${item.title}`,
              `status: ${item.status}`,
              `retryable: ${item.retryable}`,
              `message: ${item.message}`,
              ...(item.fixHint ? [`fix_hint: ${item.fixHint}`] : [])
            ].join('\n')
          })
          .join('\n\n')
      : '(no action feedback yet)'

  return ['## ActionFeedback', body].join('\n\n')
}
