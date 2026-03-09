import { describe, expect, it } from 'vitest'
import {
  collectOFSelectorVariableRoots,
  normalizeOFSelector,
  normalizeOFRunnableNodeSelectorData,
  OFBlockEnum
} from './index'

describe('selector-utils', () => {
  it('splits malformed nested start-variable selectors while preserving namespaced store keys', () => {
    expect(normalizeOFSelector(['content_package.config.process_mode'], ['content_package'])).toEqual(
      ['content_package', 'config', 'process_mode']
    )
    expect(normalizeOFSelector(['router.result'], ['content_package'])).toEqual(['router.result'])
  })

  it('repairs legacy ifelse compare_selector misuse', () => {
    const data: Record<string, any> = {
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

    normalizeOFRunnableNodeSelectorData(OFBlockEnum.IfElse, data, ['content_package'])

    expect(data.cases[0].conditions[0].variable_selector).toEqual([
      'content_package',
      'config',
      'process_mode'
    ])
    expect(data.cases[0].conditions[0].compare_selector).toBeUndefined()
    expect(data.cases[0].conditions[0].compare_source_mode).toBeUndefined()
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
