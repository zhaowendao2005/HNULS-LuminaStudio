import { describe, expect, it } from 'vitest'
import { buildAnalysisCopilotSpecializationPrompt } from './analysis-specialization'
import { buildCopilotEditorBasePrompt } from './base-prompt'

describe('copilot-editor-agent prompts', () => {
  it('keeps base prompt focused on generic shell contract', () => {
    const prompt = buildCopilotEditorBasePrompt()

    expect(prompt).toContain('<LUMINA_PLANNING_COMMANDS>')
    expect(prompt).toContain('MODE APPLY | PROPOSE | NOOP')
    expect(prompt).toContain('不要用 markdown 代码块包裹隐藏命令块')
  })

  it('adds analysis-stage specific canonical dsl and forbidden pseudo formats', () => {
    const prompt = buildAnalysisCopilotSpecializationPrompt()

    expect(prompt).toContain('REPLACE_SECTION analysis-summary')
    expect(prompt).toContain('<CONTENT>')
    expect(prompt).toContain('section-key:')
    expect(prompt).toContain('new-content: |')
    expect(prompt).toContain('只能编辑 planning section 正文')
  })
})
