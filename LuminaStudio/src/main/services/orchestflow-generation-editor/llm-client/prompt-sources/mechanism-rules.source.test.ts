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
    expect(text).toContain('## 控制流 Handle 契约')
    expect(text).toContain('普通节点禁止把控制流 handle 写成 input/output')
    expect(text).toContain('llm: 控制流入边 handle = target；控制流出边 handle = source。')
    expect(text).toContain(
      'if: 控制流入边 handle = target；控制流出边 handle 必须使用 case.handleId 或 elseCase.handleId。'
    )
  })
})
