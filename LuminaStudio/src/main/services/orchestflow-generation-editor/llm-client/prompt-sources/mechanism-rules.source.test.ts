import { describe, expect, it } from 'vitest'
import { buildMechanismRulesPrompt } from './mechanism-rules.source'

describe('prompt-sources mechanism rules', () => {
  it('includes workflow metadata constraints for stage-two guidance', () => {
    const text = buildMechanismRulesPrompt()
    expect(text).toContain('## Workflow 元信息约束')
    expect(text).toContain('workflow.name')
    expect(text).toContain('[workflow]')
    expect(text).toContain('name = "your-workflow-name"')
    expect(text).toContain('[workflow] section 允许设置的键仅有')
    expect(text).toContain('## LLM 输出格式红线')
    expect(text).toContain('不要输出多行数组项')
    expect(text).toContain('正确写法示例：`outputs = ["x:string <- @ref"')
  })
})
