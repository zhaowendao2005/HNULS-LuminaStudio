import {
  projectActionResultMarkdown,
  type NormalChatActionResultRecord
} from '../../actions/shared/action-result-projection'

export function buildActionResultsSection(results: NormalChatActionResultRecord[]): string {
  const body =
    results.length > 0
      ? results.map((result) => projectActionResultMarkdown(result)).join('\n\n')
      : '(no action results yet)'

  return ['## ActionResults', body].join('\n\n')
}
