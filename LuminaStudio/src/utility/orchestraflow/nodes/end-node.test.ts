import { describe, expect, it } from 'vitest'
import { OFBlockEnum, OFVarType, type OFNode } from '@shared/Orchestraflow-types'
import type { ExecutionContext } from './types'
import { EndNode } from './end-node'
import { VariableStore } from '../services/variable-store'

function createEndNode(overrides: Record<string, unknown> = {}): OFNode {
  return {
    id: 'end-node',
    type: 'end',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.End,
      title: 'end',
      desc: '',
      output: {
        variables: [],
        ...(overrides.output as Record<string, unknown> | undefined)
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
    runId: 'run-end',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: variableStore.getAll(),
    variables: variableStore.getAll(),
    scopePath: [],
    traceKey: 'trace-end',
    providerConfigs: {},
    executeGraph: async () => ({ status: 'succeeded' }),
    isStopped: () => false,
    ...overrides
  }
}

describe('EndNode', () => {
  it('supports composite output templates with @path placeholders', async () => {
    const variableStore = new VariableStore()
    variableStore.set('final_text.output', 'hello')
    variableStore.set('audit.output', { score: 9 })
    const node = createEndNode({
      output: {
        variables: [
          {
            variable: 'result',
            type: OFVarType.Object,
            value_template: {
              content: '@final_text.output',
              report: '@audit.output',
              ok: true
            }
          }
        ]
      }
    })

    const result = await new EndNode(node, variableStore).execute(
      createContext(node, variableStore)
    )

    expect(result.error).toBeUndefined()
    expect(result.outputs).toEqual({
      result: {
        content: 'hello',
        report: { score: 9 },
        ok: true
      }
    })
  })
})
