import { describe, expect, it } from 'vitest'
import { extractVisibleTextAndDsl, normalizeCopilotEditorCommandDsl } from './dsl'

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

  it('normalizes section-key and new-content style pseudo dsl into canonical dsl', () => {
    const normalized = normalizeCopilotEditorCommandDsl(`
<LUMINA_PLANNING_COMMANDS>
DOC doc_123
MODE APPLY
REPLACE_SECTION
section-key: analysis-summary
new-content: |
  - 重新整理后的摘要。
</LUMINA_PLANNING_COMMANDS>`)

    expect(normalized).toContain('REPLACE_SECTION analysis-summary')
    expect(normalized).toContain('<CONTENT>')
    expect(normalized).toContain('- 重新整理后的摘要。')
    expect(normalized).toContain('</CONTENT>')
  })

  it('keeps empty command dsl empty when marker is missing', () => {
    const normalized = normalizeCopilotEditorCommandDsl('')

    expect(normalized).toBe('')
  })

  it('removes markdown fences around hidden dsl content', () => {
    const normalized = normalizeCopilotEditorCommandDsl(`
\`\`\`xml
<LUMINA_PLANNING_COMMANDS>
DOC doc_123
MODE APPLY
APPEND_SECTION design-blueprint-requirements
<CONTENT>
- 补充蓝图约束。
</CONTENT>
</LUMINA_PLANNING_COMMANDS>
\`\`\``)

    expect(normalized).not.toContain('```')
    expect(normalized).toContain('APPEND_SECTION design-blueprint-requirements')
  })
})
