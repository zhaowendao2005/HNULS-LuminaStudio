import { describe, expect, it } from 'vitest'
import {
  CANONICAL_ARRAY_SCHEMA_TEMPLATE,
  CANONICAL_END_OUTPUT_TEMPLATE,
  CANONICAL_LET_TEMPLATE,
  CANONICAL_LOOP_VAR_TEMPLATE,
  CANONICAL_OBJECT_SCHEMA_TEMPLATE,
  CANONICAL_REF_SOURCE_TEMPLATE,
  CANONICAL_START_INPUT_TEMPLATE,
  CANONICAL_VALUE_SOURCE_TEMPLATE,
  buildDslSyntaxPrompt
} from './dsl-syntax.source'

describe('prompt-sources dsl syntax', () => {
  it('only renders canonical syntax skeletons', () => {
    const text = buildDslSyntaxPrompt()

    expect(text).toContain('OFT/1')
    expect(text).toContain('[workflow]')
    expect(text).toContain('唯一合法变量骨架')
    expect(text).toContain(CANONICAL_START_INPUT_TEMPLATE)
    expect(text).toContain(CANONICAL_LOOP_VAR_TEMPLATE)
    expect(text).toContain(CANONICAL_LET_TEMPLATE)
    expect(text).toContain(CANONICAL_END_OUTPUT_TEMPLATE)
    expect(text).toContain(CANONICAL_OBJECT_SCHEMA_TEMPLATE)
    expect(text).toContain(CANONICAL_ARRAY_SCHEMA_TEMPLATE)
    expect(text).toContain(CANONICAL_REF_SOURCE_TEMPLATE)
    expect(text).toContain(CANONICAL_VALUE_SOURCE_TEMPLATE)
    expect(text).toContain('不要多行数组或多行对象')
    expect(text).not.toContain('[input.')
    expect(text).not.toContain('<- @')
    expect(text).not.toContain('name:type=value')
    expect(text).not.toContain('item_schema')
    expect(text).not.toContain('value_selector')
    expect(text).not.toContain('value_ref')
    expect(text).not.toContain('data.model.provider')
    expect(text).not.toContain('system-managed')
  })
})
