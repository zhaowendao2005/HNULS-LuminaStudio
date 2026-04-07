/**
 * NormalChatAssistantOutputParser 单元测试
 *
 * 测试助手输出解析器的核心场景：
 * 1. 纯文本回复（无 action/thinking 块）
 * 2. 包含 action 块的回复（正常解析）
 * 3. action 块 JSON 格式不合法（应抛出错误）
 * 4. action 块存在但正文为空（应抛出错误）
 */
import { describe, expect, it } from 'vitest'
import { NormalChatAssistantOutputParser } from './assistant-output-parser'

const parser = new NormalChatAssistantOutputParser()

describe('NormalChatAssistantOutputParser', () => {
  /** 测试场景 1：纯文本回复，无任何特殊块 */
  it('returns plain markdown when no action block exists', () => {
    expect(parser.parse('plain reply')).toEqual({
      body_md: 'plain reply',
      action_calls: [],
      thinking_md: null
    })
  })

  /** 测试场景 2：包含一个 action 块的回复，应正确提取动作调用 */
  it('extracts one action block from markdown', () => {
    const output = parser.parse(
      [
        '我先执行检索。',
        '',
        '```normal_chat_action',
        '{"actionKey":"functioncall.pubmed_search","input":{"query":"COVID-19"}}',
        '```'
      ].join('\n')
    )

    expect(output.body_md).toBe('我先执行检索。')
    expect(output.action_calls).toEqual([
      {
        actionKey: 'functioncall.pubmed_search',
        input: {
          query: 'COVID-19'
        }
      }
    ])
    expect(output.thinking_md).toBeNull()
  })

  /** 测试场景 3：action 块 JSON 格式不合法，应抛出 Malformed 错误 */
  it('fails when action block json is invalid', () => {
    expect(() =>
      parser.parse(['说明文本', '', '```normal_chat_action', '{bad json}', '```'].join('\n'))
    ).toThrow('Malformed normal_chat_action block')
  })

  /** 测试场景 4：action 块存在但正文为空，应抛出 body markdown must not be empty 错误 */
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
