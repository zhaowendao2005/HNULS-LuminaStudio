import { describe, expect, it } from 'vitest'
import { buildDslSyntaxPrompt } from './dsl-syntax.source'

describe('prompt-sources dsl syntax', () => {
  it('only renders syntax and format rules', () => {
    const text = buildDslSyntaxPrompt()
    expect(text).toContain('OFT/1')
    expect(text).toContain('[workflow]')
    expect(text).toContain('仅定义语法和格式')
    expect(text).toContain('LLM 强制写法提醒')
    expect(text).toContain(
      '不要把 `outputs`、`edges`、`inputs`、`vars`、`let` 这类数组拆成多行条目'
    )
    expect(text).toContain('不要写成 `上游.output -> 下游.input`')
    expect(text).toContain('outputs = ["final_content:string <- @refine_loop.result"')
    expect(text).not.toContain('data.model.provider')
    expect(text).not.toContain('system-managed')
  })
})
