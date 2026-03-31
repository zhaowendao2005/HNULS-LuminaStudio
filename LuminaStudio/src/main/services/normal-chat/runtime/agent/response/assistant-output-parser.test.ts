import { describe, expect, it } from 'vitest'
import { NormalChatAssistantOutputParser } from './assistant-output-parser'

const parser = new NormalChatAssistantOutputParser()

describe('NormalChatAssistantOutputParser', () => {
  it('returns plain markdown when no action block exists', () => {
    expect(parser.parse('plain reply')).toEqual({
      body_md: 'plain reply',
      action_calls: []
    })
  })

  it('extracts one action block from markdown', () => {
    const output = parser.parse(
      [
        '我先执行检索。',
        '',
        '```normal_chat_action',
        '{"actionKey":"functioncall.pubmed_search","input":{"query":"COVID-19","top_k":5,"sort":"relevance","date_from":null,"date_to":null,"api_key_ref_id":null}}',
        '```'
      ].join('\n')
    )

    expect(output.body_md).toBe('我先执行检索。')
    expect(output.action_calls).toEqual([
      {
        actionKey: 'functioncall.pubmed_search',
        input: {
          query: 'COVID-19',
          top_k: 5,
          sort: 'relevance',
          date_from: null,
          date_to: null,
          api_key_ref_id: null
        }
      }
    ])
  })

  it('fails when action block json is invalid', () => {
    expect(() =>
      parser.parse(['说明文本', '', '```normal_chat_action', '{bad json}', '```'].join('\n'))
    ).toThrow('Malformed normal_chat_action block')
  })

  it('fails when action block exists but body is empty', () => {
    expect(() =>
      parser.parse(
        [
          '```normal_chat_action',
          '{"actionKey":"system.get_action_spec","input":{"action_key":"functioncall.pubmed_search"}}',
          '```'
        ].join('\n')
      )
    ).toThrow('body markdown must not be empty')
  })
})
