import { describe, expect, it } from 'vitest'
import { OFBlockEnum, type OFNode } from '@shared/Orchestraflow-types'
import type { ExecutionContext } from './types'
import { IfElseNode } from './if-else-node'
import { VariableStore } from '../services/variable-store'

function createIfElseNode(overrides: Record<string, unknown> = {}): OFNode {
  return {
    id: 'if-node',
    type: 'ifelse',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.IfElse,
      title: 'if',
      desc: '',
      cases: [
        {
          id: 'case-1',
          kind: 'if',
          label: 'all_pass',
          handleId: 'all_pass',
          conditions: [
            {
              id: 'condition-1',
              variable_ref: {
                selector: ['review_flags'],
                path: 'review_flags'
              },
              variable_selector: ['review_flags'],
              operator: 'all_true'
            }
          ]
        }
      ],
      elseCase: {
        handleId: 'else',
        label: 'ELSE'
      },
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
    runId: 'run-if',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: variableStore.getAll(),
    variables: variableStore.getAll(),
    scopePath: [],
    traceKey: 'trace-if',
    providerConfigs: {},
    executeGraph: async () => ({ status: 'succeeded' }),
    isStopped: () => false,
    ...overrides
  }
}

describe('IfElseNode', () => {
  it('supports all_true aggregation on boolean arrays', async () => {
    const variableStore = new VariableStore()
    variableStore.set('review_flags', [true, true, true])
    const node = createIfElseNode()

    const result = await new IfElseNode(node, variableStore).execute(
      createContext(node, variableStore)
    )

    expect(result.error).toBeUndefined()
    expect(result.outputs.matchedHandleId).toBe('all_pass')
    expect(result.control?.selectedSourceHandleIds).toEqual(['all_pass'])
  })
})
