import { describe, expect, it } from 'vitest'
import { listOFMechanismDefinitions, resolveOFMechanismDefinition } from '.'

describe('OF mechanism registry', () => {
  it('lists the built-in mechanism definitions', () => {
    const definitions = listOFMechanismDefinitions()
    expect(definitions.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'selector-ref',
        'variables',
        'edge-handle',
        'container',
        'blueprint-syntax'
      ])
    )
  })

  it('resolves a mechanism definition by id', () => {
    const selectorDefinition = resolveOFMechanismDefinition('selector-ref')
    expect(selectorDefinition.selector_contract?.representation).toBe('store-key-array')
  })
})
