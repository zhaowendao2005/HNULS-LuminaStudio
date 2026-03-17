import { describe, expect, it } from 'vitest'
import type { GenerationMessage } from '@preload/types'
import {
  getRequirementPlanningBlock,
  parseRequirementPlanningMarkdownSections
} from './generation-editor.types'

function buildMessage(overrides: Partial<GenerationMessage> = {}): GenerationMessage {
  return {
    id: 'message-1',
    sessionId: 'session-1',
    channelKey: 'analysis-planner',
    role: 'assistant',
    status: 'completed',
    content: '',
    metaJson: null,
    requestId: 'request-1',
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z',
    ...overrides
  }
}

describe('generation-editor requirement planning block', () => {
  it('parses the four required markdown sections', () => {
    const sections = parseRequirementPlanningMarkdownSections(`
# \u6458\u8981
- \u4e00\u53e5\u8bdd\u603b\u7ed3

## \u76ee\u6807
- \u843d\u5730\u529f\u80fd A

## \u7ea6\u675f
- \u4e0d\u6539 IPC

## \u6210\u529f\u6807\u51c6
- \u80fd\u6b63\u786e\u6e32\u67d3 block
`)

    expect(sections['\u6458\u8981']?.content).toContain('\u4e00\u53e5\u8bdd\u603b\u7ed3')
    expect(sections['\u76ee\u6807']?.content).toContain('\u843d\u5730\u529f\u80fd A')
    expect(sections['\u7ea6\u675f']?.content).toContain('\u4e0d\u6539 IPC')
    expect(sections['\u6210\u529f\u6807\u51c6']?.content).toContain(
      '\u80fd\u6b63\u786e\u6e32\u67d3 block'
    )
  })

  it('builds a planning block only for analysis-planner assistant messages', () => {
    const block = getRequirementPlanningBlock(
      buildMessage({
        content: `
# \u6458\u8981
- \u751f\u6210\u9700\u6c42\u89c4\u5212

## \u76ee\u6807
- \u6062\u590d\u65e7 message block

## \u7ea6\u675f
- \u4ec5\u524d\u7aef\u8bc6\u522b

## \u6210\u529f\u6807\u51c6
- analysis \u6d88\u606f\u6309 block \u5c55\u793a
`
      })
    )

    expect(block).not.toBeNull()
    expect(block?.summaryText).toContain('\u751f\u6210\u9700\u6c42\u89c4\u5212')
  })

  it('does not misclassify non analysis-planner messages', () => {
    const block = getRequirementPlanningBlock(
      buildMessage({
        channelKey: 'planning-copilot',
        content: `
# \u6458\u8981
- \u770b\u8d77\u6765\u50cf\u89c4\u5212

## \u76ee\u6807
- \u4f46\u4e0d\u5e94\u8be5\u547d\u4e2d

## \u7ea6\u675f
- channel \u4e0d\u5bf9

## \u6210\u529f\u6807\u51c6
- \u8fd4\u56de null
`
      })
    )

    expect(block).toBeNull()
  })

  it('does not build a block when required sections are incomplete', () => {
    const block = getRequirementPlanningBlock(
      buildMessage({
        content: `
# \u6458\u8981
- \u53ea\u6709\u6458\u8981

## \u76ee\u6807
- \u53ea\u6709\u76ee\u6807
`
      })
    )

    expect(block).toBeNull()
  })
})
