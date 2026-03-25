import { describe, expect, it } from 'vitest'
import { getBaseChatAgentHelperBindings } from './bindings'

describe('base-chat-agent helper bindings', () => {
  it('声明本模板启用的 helper 及 graph overlay', () => {
    const bindings = getBaseChatAgentHelperBindings()

    expect(bindings).toEqual([
      expect.objectContaining({
        helperId: 'pubmed-search'
      })
    ])
    expect(bindings[0]?.descriptionOverlay).toContain('base-chat-agent')
    expect(bindings[0]?.schemaOverlay).toContain('英文学术检索词')
  })
})
