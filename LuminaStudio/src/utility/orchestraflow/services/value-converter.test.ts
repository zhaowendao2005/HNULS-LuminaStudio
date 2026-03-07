import { describe, expect, it } from 'vitest'
import { OFVarType } from '@shared/Orchestraflow-types'
import { convertValue } from './value-converter'

describe('convertValue', () => {
  it('stringifies objects when target type is string', () => {
    expect(
      convertValue(
        { a: 1 },
        {
          targetType: OFVarType.String,
          targetVariable: 'text_value'
        }
      )
    ).toBe('{"a":1}')
  })

  it('applies boolean coercion rules for strings', () => {
    expect(
      convertValue('off', {
        targetType: OFVarType.Boolean,
        targetVariable: 'enabled'
      })
    ).toBe(false)

    expect(
      convertValue('custom-text', {
        targetType: OFVarType.Boolean,
        targetVariable: 'enabled'
      })
    ).toBe(true)
  })

  it('rejects invalid JSON or unsupported object conversions', () => {
    expect(() =>
      convertValue('oops', {
        targetType: OFVarType.Object,
        targetVariable: 'payload',
        sourcePath: 'payload'
      })
    ).toThrow('invalid JSON')

    expect(() =>
      convertValue([], {
        targetType: OFVarType.Number,
        targetVariable: 'count',
        sourcePath: 'items'
      })
    ).toThrow('count')
  })
})
