import { describe, expect, it } from 'vitest'
import {
  NormalChatAssistantProtocolStreamScanner,
  scanAssistantProtocolMarkdown
} from './action-block-extractor'

describe('NormalChatAssistantProtocolStreamScanner', () => {
  it('does not duplicate previewed visible text when a line closes in the next chunk', () => {
    const scanner = new NormalChatAssistantProtocolStreamScanner()

    const first = scanner.feed('hello')
    const second = scanner.feed(' world\n')
    const final = scanner.finish()

    expect(first.visibleDelta).toBe('hello')
    expect(second.visibleDelta).toBe(' world\n')
    expect(final.visibleDelta).toBe('')
  })

  it('hides a streamed subagent action block while still extracting it once closed', () => {
    const scanner = new NormalChatAssistantProtocolStreamScanner()

    const first = scanner.feed(
      ['I will dispatch a focused subagent.', '', '```normal_chat_action'].join('\n')
    )
    const second = scanner.feed(
      [
        '',
        '{"actionKey":"system.dispatch_sub_agent","input":{"goal":"protein engineering","enabled_action_keys":["functioncall.pubmed_search"]}}',
        '```'
      ].join('\n')
    )
    const final = scanner.finish()

    expect(`${first.visibleDelta}${second.visibleDelta}${final.visibleDelta}`).toBe(
      'I will dispatch a focused subagent.\n\n'
    )

    const blocks = [...first.actionBlocks, ...second.actionBlocks, ...final.actionBlocks]
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.rawJson).toBe(
      '{"actionKey":"system.dispatch_sub_agent","input":{"goal":"protein engineering","enabled_action_keys":["functioncall.pubmed_search"]}}'
    )
  })
})

describe('scanAssistantProtocolMarkdown', () => {
  it('keeps ordinary markdown fences visible while stripping protocol fences', () => {
    const scanned = scanAssistantProtocolMarkdown(
      [
        'Visible intro',
        '',
        '```ts',
        "console.log('visible')",
        '```',
        '',
        '```normal_chat_action',
        '{"actionKey":"functioncall.pubmed_search","input":{"query":"protein engineering"}}',
        '```'
      ].join('\n')
    )

    expect(scanned.visibleBodyMarkdown).toBe(
      ['Visible intro', '', '```ts', "console.log('visible')", '```', '', ''].join('\n')
    )
    expect(scanned.actionBlocks).toHaveLength(1)
    expect(scanned.thinkingBlocks).toHaveLength(0)
  })
})
