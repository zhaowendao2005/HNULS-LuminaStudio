import { describe, expect, it } from 'vitest'
import { OFBlockEnum, OFVarType, type OFNode } from '@shared/Orchestraflow-types'
import type { ExecutionContext } from './types'
import { VariableAssignNode } from './variable-assign-node'
import { VariableStore } from '../services/variable-store'

function createVariableAssignNode(overrides: Record<string, any> = {}): OFNode {
  return {
    id: 'assign-node',
    type: 'variable-assign',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.VariableAssign,
      title: 'assign',
      desc: '',
      rules: [
        {
          id: 'rule-1',
          source: {
            mode: 'variable',
            ref: {
              selector: ['profile', 'stats', 'score'],
              path: 'profile.stats.score',
              type: OFVarType.Number
            }
          },
          source_mode: 'variable',
          target_variable: 'score_text',
          target_type: OFVarType.String
        }
      ],
      output: { variables: [] },
      ...overrides
    }
  } as OFNode
}

function createContext(
  node: OFNode,
  variableStore: VariableStore,
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    runId: 'run-assign',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: variableStore.getAll(),
    variables: variableStore.getAll(),
    scopePath: [],
    traceKey: 'trace-assign',
    providerConfigs: {},
    executeGraph: async () => ({ status: 'succeeded' }),
    isStopped: () => false,
    ...overrides
  }
}

describe('VariableAssignNode', () => {
  it('supports nested variable selectors and writes namespaced outputs', async () => {
    const variableStore = new VariableStore()
    variableStore.set('profile', {
      stats: {
        score: 42
      }
    })
    const node = createVariableAssignNode()

    const result = await new VariableAssignNode(node, variableStore).execute(
      createContext(node, variableStore)
    )

    expect(result.error).toBeUndefined()
    expect(result.outputs).toEqual({ score_text: '42' })
    expect(variableStore.get('assign.score_text')).toBe('42')
    expect(variableStore.get('assign-node.score_text')).toBe('42')
  })

  it('converts constant JSON strings into structured values', async () => {
    const variableStore = new VariableStore()
    const node = createVariableAssignNode({
      rules: [
        {
          id: 'rule-1',
          source: {
            mode: 'constant',
            constant_value: '{"name":"Lumina"}'
          },
          source_mode: 'constant',
          target_variable: 'payload',
          target_type: OFVarType.Object
        },
        {
          id: 'rule-2',
          source: {
            mode: 'constant',
            constant_value: '[1,2,3]'
          },
          source_mode: 'constant',
          target_variable: 'items',
          target_type: OFVarType.Array
        }
      ]
    })

    const result = await new VariableAssignNode(node, variableStore).execute(
      createContext(node, variableStore)
    )

    expect(result.error).toBeUndefined()
    expect(result.outputs).toEqual({
      payload: { name: 'Lumina' },
      items: [1, 2, 3]
    })
  })

  it('resolves @path placeholders inside composite constant values', async () => {
    const variableStore = new VariableStore()
    variableStore.set('draft', {
      text: 'hello',
      meta: {
        score: 9
      }
    })
    const node = createVariableAssignNode({
      rules: [
        {
          id: 'rule-1',
          source: {
            mode: 'constant',
            constant_value: {
              raw: '@draft.text',
              score: '@draft.meta.score',
              ok: true
            }
          },
          source_mode: 'constant',
          target_variable: 'payload',
          target_type: OFVarType.Object
        }
      ]
    })

    const result = await new VariableAssignNode(node, variableStore).execute(
      createContext(node, variableStore)
    )

    expect(result.error).toBeUndefined()
    expect(result.outputs).toEqual({
      payload: {
        raw: 'hello',
        score: 9,
        ok: true
      }
    })
  })

  it('fails atomically when any rule conversion fails', async () => {
    const variableStore = new VariableStore()
    variableStore.set('profile', {
      stats: {
        score: 42
      }
    })
    const node = createVariableAssignNode({
      rules: [
        {
          id: 'rule-1',
          source: {
            mode: 'variable',
            ref: {
              selector: ['profile', 'stats', 'score'],
              path: 'profile.stats.score',
              type: OFVarType.Number
            }
          },
          source_mode: 'variable',
          target_variable: 'score_text',
          target_type: OFVarType.String
        },
        {
          id: 'rule-2',
          source: {
            mode: 'constant',
            constant_value: 'not-a-number'
          },
          source_mode: 'constant',
          target_variable: 'broken_number',
          target_type: OFVarType.Number
        }
      ]
    })

    const result = await new VariableAssignNode(node, variableStore).execute(
      createContext(node, variableStore)
    )

    expect(result.error).toContain('broken_number')
    expect(result.outputs).toEqual({})
    expect(variableStore.has('assign.score_text')).toBe(false)
    expect(variableStore.has('assign-node.score_text')).toBe(false)
    expect(variableStore.has('assign.broken_number')).toBe(false)
  })
})
