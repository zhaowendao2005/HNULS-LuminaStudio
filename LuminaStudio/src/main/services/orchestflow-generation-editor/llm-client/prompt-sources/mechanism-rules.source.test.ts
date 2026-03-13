import { describe, expect, it } from 'vitest'
import { buildMechanismRulesPrompt } from './mechanism-rules.source'

describe('prompt-sources mechanism rules', () => {
  it('includes workflow metadata constraints for stage-two guidance', () => {
    const text = buildMechanismRulesPrompt()
    expect(text).toContain('## Workflow 元信息约束')
    expect(text).toContain('workflow.name')
    expect(text).toContain('[workflow]')
    expect(text).toContain('name = "your-workflow-name"')
    expect(text).toContain('允许设置的 workflow 字段仅有')
  })
})
