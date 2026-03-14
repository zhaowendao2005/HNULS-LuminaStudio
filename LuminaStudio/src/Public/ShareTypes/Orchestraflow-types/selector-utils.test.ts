import { describe, expect, it } from 'vitest'
import {
  collectOFSelectorVariableRoots,
  normalizeOFSelector,
  normalizeOFRunnableNodeSelectorData,
  OFBlockEnum
} from './index'

describe('selector-utils', () => {
  it('splits malformed nested start-variable selectors while preserving namespaced store keys', () => {
    expect(
      normalizeOFSelector(['content_package.config.process_mode'], ['content_package'])
    ).toEqual(['content_package', 'config', 'process_mode'])
    expect(normalizeOFSelector(['router.result'], ['content_package'])).toEqual(['router.result'])
  })

  it('repairs legacy ifelse compare_selector misuse', () => {
    const data = {
      type: OFBlockEnum.IfElse,
      cases: [
        {
          conditions: [
            {
              id: 'cond_1',
              compare_source_mode: 'variable',
              compare_selector: ['content_package.config.process_mode'],
              operator: 'is',
              value: 'batch',
              value_type: 'string'
            }
          ]
        }
      ]
    }

    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.IfElse,
      data as unknown as Record<string, unknown>,
      ['content_package']
    )

    const condition = data.cases[0].conditions[0] as Record<string, unknown> as {
      variable_ref?: { selector: string[] }
      compare_ref?: unknown
    }

    expect(condition.variable_ref?.selector).toEqual(['content_package', 'config', 'process_mode'])
    expect(condition.compare_ref).toBeUndefined()
  })

  it('collects selector roots from nested workflow nodes', () => {
    expect(
      collectOFSelectorVariableRoots([
        {
          data: {
            type: OFBlockEnum.Start,
            input: { variables: [{ variable: 'payload' }] }
          }
        },
        {
          data: {
            type: OFBlockEnum.Loop,
            loop_variables: [{ variable: 'counter' }],
            subgraph: { nodes: [] }
          }
        }
      ])
    ).toEqual(expect.arrayContaining(['payload', 'counter']))
  })
})
