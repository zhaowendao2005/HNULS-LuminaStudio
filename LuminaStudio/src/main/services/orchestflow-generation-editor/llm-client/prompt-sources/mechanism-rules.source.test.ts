import { describe, expect, it } from 'vitest'
import { buildMechanismRulesPrompt } from './mechanism-rules.source'

describe('prompt-sources mechanism rules', () => {
  it('includes canonical authoring rules without legacy syntax spillover', () => {
    const text = buildMechanismRulesPrompt()

    expect(text).toContain('## Workflow 元信息约束')
    expect(text).toContain('workflow.name')
    expect(text).toContain('[workflow]')
    expect(text).toContain('name = "your-workflow-name"')
    expect(text).toContain('[workflow] section 允许设置的键仅有')
    expect(text).toContain('## 变量与 Schema 机制')
    expect(text).toContain('start 输入声明固定写法')
    expect(text).toContain('object schema 固定骨架')
    expect(text).toContain('array schema 固定骨架')
    expect(text).toContain('## 控制流 Handle 契约')
    expect(text).toContain('普通节点控制边只使用 source / target')
    expect(text).toContain('llm: 控制流入边 handle = target；控制流出边 handle = source。')
    expect(text).toContain(
      'if: 控制流入边 handle = target；控制流出边 handle 必须使用 case.handleId 或 elseCase.handleId。'
    )
    expect(text).toContain('## Container 子图约束')
    expect(text).toContain(
      '不要手写 `loop-start` / `iteration-start` 作为作者态节点、边端点或引用根。'
    )
    expect(text).not.toContain('[input.')
    expect(text).not.toContain('<- @')
    expect(text).not.toContain('name:type=value')
    expect(text).not.toContain('item_schema')
    expect(text).not.toContain('value_selector')
    expect(text).not.toContain('value_ref')
  })
})
