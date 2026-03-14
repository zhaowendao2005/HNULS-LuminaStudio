import { describe, expect, it } from 'vitest'
import {
  DESIGN_CALIBRATION_DSL_END_MARKER,
  DESIGN_CALIBRATION_DSL_START_MARKER,
  extractVisibleTextAndReplacementDsl
} from './dsl'

const VALID_DSL = `OFT/1
[workflow]
name = "section-demo"

[node.start]
type = "start"
inputs = [{"variable":"user_query","schema":{"type":"string","default":"hello"}}]

[node.end]
type = "end"
outputs = [{"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@user_query"}}]

[graph]
edges = ["start.source -> end.target"]`

describe('design-calibration-agent dsl', () => {
  it('extracts visible summary and replacement dsl from completed payload', () => {
    const rawText = [
      '已完成第一轮修复。',
      DESIGN_CALIBRATION_DSL_START_MARKER,
      VALID_DSL,
      DESIGN_CALIBRATION_DSL_END_MARKER
    ].join('\n')

    const extracted = extractVisibleTextAndReplacementDsl(rawText)

    expect(extracted.visibleText).toContain('已完成第一轮修复')
    expect(extracted.replacementDsl).toContain('name = "section-demo"')
    expect(extracted.truncatedTailDiscarded).toBe(false)
  })

  it('drops truncated tail lines when end marker is missing', () => {
    const rawText = [
      '已输出修复后的 DSL。',
      DESIGN_CALIBRATION_DSL_START_MARKER,
      VALID_DSL,
      'outputs = [{"variable":"broken"'
    ].join('\n')

    const extracted = extractVisibleTextAndReplacementDsl(rawText)

    expect(extracted.replacementDsl).toContain('name = "section-demo"')
    expect(extracted.replacementDsl).not.toContain('broken')
    expect(extracted.truncatedTailDiscarded).toBe(true)
  })
})
