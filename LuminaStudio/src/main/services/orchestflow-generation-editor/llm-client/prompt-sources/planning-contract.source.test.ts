import { describe, expect, it } from 'vitest'
import {
  buildPlanningEditCapabilityPrompt,
  buildPlanningOutputContractPrompt
} from './planning-contract.source'

describe('prompt-sources planning contract', () => {
  it('marks 节点声明 as downstream authoritative section', () => {
    const text = buildPlanningOutputContractPrompt()
    expect(text).toContain('节点声明')
    expect(text).toContain('authoritative source')
  })

  it('renders planning edit capability text from current/source documents', () => {
    const text = buildPlanningEditCapabilityPrompt({
      currentDocumentMarkdown: '# 需求分析\n## 摘要\n- 当前',
      sourceDocumentMarkdown: '# 需求分析\n## 摘要\n- 原始'
    })
    expect(text).toContain('## Planning Framework')
    expect(text).toContain('Current Planning Document')
    expect(text).toContain('Source Planning Document')
  })
})
