import { describe, expect, it } from 'vitest'
import {
  applyOFPlanningEditCommands,
  buildOFPlanningMarkdown,
  createEmptyOFPlanningDocument,
  listAffectedOFPlanningSectionKeys,
  parseOFPlanningCommandDsl,
  parseOFPlanningMarkdown
} from './planning-framework'

describe('planning-framework', () => {
  it('round-trips fixed planning markdown skeleton', () => {
    const document = createEmptyOFPlanningDocument()
    document.sections['analysis-summary'] = '- 当前已进入共享 planning document 方案。'
    document.sections['design-blueprint-requirements'] = '- 后续阶段继续沿用固定标题框架。'

    const markdown = buildOFPlanningMarkdown(document)
    const parsed = parseOFPlanningMarkdown(markdown)

    expect(parsed.errors).toEqual([])
    expect(parsed.document.sections['analysis-summary']).toContain('共享 planning document')
    expect(parsed.document.sections['design-blueprint-requirements']).toContain('固定标题框架')
  })

  it('parses command dsl and applies section-level edits', () => {
    const parsedDsl = parseOFPlanningCommandDsl(`
<LUMINA_PLANNING_COMMANDS>
DOC doc_123
MODE APPLY

REPLACE_SECTION analysis-summary
<CONTENT>
- 重新整理本轮摘要。
</CONTENT>

APPEND_SECTION design-blueprint-requirements
<CONTENT>
- 补充蓝图阶段要求。
</CONTENT>
</LUMINA_PLANNING_COMMANDS>
`)

    expect(parsedDsl.errors).toEqual([])
    expect(parsedDsl.mode).toBe('apply')
    expect(listAffectedOFPlanningSectionKeys(parsedDsl.commands)).toEqual([
      'analysis-summary',
      'design-blueprint-requirements'
    ])

    const initial = createEmptyOFPlanningDocument()
    const next = applyOFPlanningEditCommands(initial, parsedDsl.commands)

    expect(next.sections['analysis-summary']).toContain('重新整理本轮摘要')
    expect(next.sections['design-blueprint-requirements']).toContain('补充蓝图阶段要求')
  })
})
