import type { NormalChatActionExecutorOutput } from './action.types'

export interface NormalChatActionResultRecord {
  actionKey: string
  title: string
  output: NormalChatActionExecutorOutput
}

export function projectActionResultMarkdown(record: NormalChatActionResultRecord): string {
  return `### ${record.title}\n\n${JSON.stringify(record.output, null, 2)}`
}
