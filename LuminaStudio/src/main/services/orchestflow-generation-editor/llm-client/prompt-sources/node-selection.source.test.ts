import { describe, expect, it } from 'vitest'
import {
  buildDeclaredNodesPrompt,
  buildNodeSelectionCatalogPrompt,
  extractDeclaredNodeTypesFromPlanningMarkdown
} from './node-selection.source'
import { buildDeclaredNodeSpecsPrompt } from './declared-node-spec.source'

describe('prompt-sources node selection', () => {
  it('extracts declared node types from 节点声明 section', () => {
    const result = extractDeclaredNodeTypesFromPlanningMarkdown(`
# 需求分析
## 摘要
- demo

# 设计交接
## 节点声明
- start：接收输入
- llm：生成回复
- end：输出结果
`)

    expect(result).toEqual(['start', 'llm', 'end'])
  })

  it('renders node selection catalog from shared registry', () => {
    const text = buildNodeSelectionCatalogPrompt()
    expect(text).toContain('## 节点选择目录')
    expect(text).toContain('type: start')
    expect(text).toContain('type: llm')
  })

  it('renders declared node specs only for declared nodes plus start/end fallback', () => {
    const text = buildDeclaredNodeSpecsPrompt(`
# 需求分析
## 摘要
- demo

# 设计交接
## 节点声明
- llm：生成回复
`)

    expect(text).toContain('type: start')
    expect(text).toContain('type: llm')
    expect(text).toContain('type: end')
    expect(text).toContain('OFT/1 节点 section')
    expect(text).not.toContain('type: ifelse')
  })

  it('falls back with explicit warning when declaration section is missing', () => {
    const text = buildDeclaredNodesPrompt('# 需求分析\n## 摘要\n- demo')
    expect(text).toContain('当前 planning 快照里没有识别到节点声明')
  })
})
