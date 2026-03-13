import { describe, expect, it } from 'vitest'
import { resolveInitialStatus, validateCopilotEditorModelResult } from './result'

describe('copilot-editor-agent result helpers', () => {
  it('marks canonical command dsl as valid and pending when auto approval is off', () => {
    const validated = validateCopilotEditorModelResult({
      rawText: '原始输出',
      visibleText: '我已经整理好摘要修改建议。',
      commandDsl: `<LUMINA_PLANNING_COMMANDS>
DOC doc_123
MODE PROPOSE
REPLACE_SECTION analysis-summary
<CONTENT>
- 更新后的摘要正文。
</CONTENT>
</LUMINA_PLANNING_COMMANDS>`,
      usage: undefined,
      rawTrace: []
    })

    expect(validated.isValid).toBe(true)
    expect(validated.validationError).toBeNull()
    expect(validated.parsedDsl.commands).toHaveLength(1)
    expect(
      resolveInitialStatus({
        mode: validated.parsedDsl.mode,
        autoApproved: false,
        isValid: validated.isValid
      })
    ).toBe('pending')
  })

  it('marks invalid command dsl as failed instead of pending/applied', () => {
    const validated = validateCopilotEditorModelResult({
      rawText: '原始输出',
      visibleText: '我先描述思路，但没有合法命令。',
      commandDsl: `<LUMINA_PLANNING_COMMANDS>
DOC doc_123
MODE APPLY
REPLACE_SECTION
section-key: analysis-summary
new-content: |
  - 这还是未归一化前的非法命令。
</LUMINA_PLANNING_COMMANDS>`,
      usage: undefined,
      rawTrace: []
    })

    expect(validated.isValid).toBe(false)
    expect(validated.validationError).toContain('无法解析')
    expect(
      resolveInitialStatus({
        mode: validated.parsedDsl.mode,
        autoApproved: true,
        isValid: validated.isValid
      })
    ).toBe('failed')
  })

  it('reports missing marker as validation error when command dsl is empty', () => {
    const validated = validateCopilotEditorModelResult({
      rawText: '只有可见正文',
      visibleText: '只有可见正文',
      commandDsl: '',
      usage: undefined,
      rawTrace: []
    })

    expect(validated.isValid).toBe(false)
    expect(validated.validationError).toContain('缺少 DSL marker')
  })
})
