import { describe, expect, it } from 'vitest'
import { extractVisibleTextAndDsl } from './dsl'

describe('copilot-editor-agent dsl', () => {
  it('extracts visible assistant text and hidden planning command dsl', () => {
    const rawText = `我已经整理好本轮 planning 工作稿修改建议。
<LUMINA_PLANNING_COMMANDS>
DOC doc_123
MODE APPLY
NOOP
</LUMINA_PLANNING_COMMANDS>`

    const extracted = extractVisibleTextAndDsl(rawText)

    expect(extracted.visibleText).toContain('整理好本轮 planning 工作稿修改建议')
    expect(extracted.commandDsl).toContain('DOC doc_123')
    expect(extracted.commandDsl).toContain('MODE APPLY')
  })
})
