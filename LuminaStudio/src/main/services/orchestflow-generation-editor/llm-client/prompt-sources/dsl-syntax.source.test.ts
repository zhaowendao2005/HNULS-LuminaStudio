import { describe, expect, it } from 'vitest'
import { buildDslSyntaxPrompt } from './dsl-syntax.source'

describe('prompt-sources dsl syntax', () => {
  it('only renders syntax and format rules', () => {
    const text = buildDslSyntaxPrompt()
    expect(text).toContain('OFT/1')
    expect(text).toContain('[workflow]')
    expect(text).toContain('仅定义语法和格式')
    expect(text).not.toContain('data.model.provider')
    expect(text).not.toContain('system-managed')
  })
})
