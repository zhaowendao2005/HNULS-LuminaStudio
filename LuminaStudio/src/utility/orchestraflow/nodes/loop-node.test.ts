import { describe, expect, it, vi } from 'vitest'
import { OFBlockEnum, OFVarType, type OFNode } from '@shared/Orchestraflow-types'
import { LoopNode } from './loop-node'
import { VariableStore } from '../services/variable-store'
import type { ExecutionContext } from './types'

function createLoopGraph(): { nodes: OFNode[]; edges: any[] } {
  return {
    nodes: [
      {
        id: 'child-start',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          type: OFBlockEnum.LoopStart,
          title: 'Loop Start',
          desc: ''
        }
      } as OFNode,
      {
        id: 'child-end',
        type: 'default',
        position: { x: 120, y: 0 },
        data: {
          type: OFBlockEnum.End,
          title: 'Loop End',
          desc: '',
          output: {
            variables: [
              {
                variable: 'counter',
                value_ref: {
                  selector: ['counter'],
                  path: 'counter'
                }
              }
            ]
          }
        }
      } as OFNode
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'child-start',
        target: 'child-end'
      }
    ]
  }
}

function createLoopNodeDefinition(overrides: Record<string, any> = {}): OFNode {
  return {
    id: 'loop1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.Loop,
      title: 'Loop',
      desc: '',
      loop_count: 3,
      loop_variables: [
        {
          variable: 'counter',
          type: OFVarType.Number,
          value_type: 'constant',
          value: 0
        }
      ],
      break_conditions: [],
      logical_operator: 'and',
      start_node_id: 'child-start',
      subgraph: createLoopGraph(),
      output: {
        variables: []
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
    runId: 'run-1',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: variableStore.getAll(),
    variables: variableStore.getAll(),
    scopePath: [],
    traceKey: 'trace-1',
    providerConfigs: {},
    executeGraph: async () => ({ status: 'succeeded' }),
    isStopped: () => false,
    ...overrides
  }
}

describe('LoopNode', () => {
  it('会按 selector 初始化循环变量，并在每轮 End 输出后回写下一轮状态', async () => {
    const variableStore = new VariableStore()
    variableStore.set('seed', 2)
    const node = createLoopNodeDefinition({
      loop_count: 2,
      loop_variables: [
        {
          variable: 'counter',
          type: OFVarType.Number,
          value_type: 'variable',
          value_source: {
            mode: 'variable',
            ref: {
              selector: ['seed'],
              path: 'seed'
            }
          }
        }
      ]
    })

    const executeGraph = vi.fn(async ({ variableStore: childStore }) => {
      const current = childStore.get('counter')
      expect(childStore.get('loop.index')).toBeTypeOf('number')
      expect(childStore.get('loop.loop_count')).toBe(2)
      return {
        status: 'succeeded' as const,
        outputs: {
          counter: current + 1
        }
      }
    })

    const loopNode = new LoopNode(node, variableStore)
    const result = await loopNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual({ counter: 4 })
    expect(executeGraph).toHaveBeenCalledTimes(2)
  })

  it('子图 End 缺少循环变量输出时会保留上一轮状态，并忽略未声明输出', async () => {
    const variableStore = new VariableStore()
    const node = createLoopNodeDefinition({
      loop_variables: [
        {
          variable: 'counter',
          type: OFVarType.Number,
          value_type: 'constant',
          value: 1
        }
      ]
    })

    let call = 0
    const executeGraph = vi.fn(async () => {
      call += 1
      if (call === 1) {
        return {
          status: 'succeeded' as const,
          outputs: { counter: 5 }
        }
      }
      return {
        status: 'succeeded' as const,
        outputs: { ignored: 99 }
      }
    })

    const loopNode = new LoopNode(node, variableStore)
    const result = await loopNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual({ counter: 5 })
    expect(executeGraph).toHaveBeenCalledTimes(3)
  })

  it('break_conditions 会在每轮执行前检查并提前终止', async () => {
    const variableStore = new VariableStore()
    const node = createLoopNodeDefinition({
      loop_count: 5,
      break_conditions: [
        {
          id: 'break-1',
          variable_ref: {
            selector: ['counter'],
            path: 'counter',
            type: OFVarType.Number
          },
          variable_type: OFVarType.Number,
          operator: 'gte',
          value: 2
        }
      ]
    })

    const executeGraph = vi.fn(async ({ variableStore: childStore }) => ({
      status: 'succeeded' as const,
      outputs: {
        counter: childStore.get('counter') + 1
      }
    }))

    const loopNode = new LoopNode(node, variableStore)
    const result = await loopNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual({ counter: 2 })
    expect(executeGraph).toHaveBeenCalledTimes(2)
  })

  it('loop_count 收敛后会把最终状态写回命名空间输出', async () => {
    const variableStore = new VariableStore()
    const node = createLoopNodeDefinition()
    const executeGraph = vi.fn(async ({ variableStore: childStore }) => ({
      status: 'succeeded' as const,
      outputs: {
        counter: childStore.get('counter') + 1
      }
    }))

    const loopNode = new LoopNode(node, variableStore)
    const result = await loopNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual({ counter: 3 })
    expect(variableStore.get('loop.result')).toEqual({ counter: 3 })
    expect(variableStore.get('loop1.result')).toEqual({ counter: 3 })
    expect(variableStore.get('loop.counter')).toBe(3)
    expect(variableStore.get('loop1.counter')).toBe(3)
  })

  it('非法配置会直接硬失败，并禁止容器嵌套', async () => {
    const variableStore = new VariableStore()
    const node = createLoopNodeDefinition({
      subgraph: {
        nodes: [
          ...createLoopGraph().nodes,
          {
            id: 'nested-iter',
            type: 'default',
            position: { x: 10, y: 10 },
            data: {
              type: OFBlockEnum.Iteration,
              title: 'Nested Iteration',
              desc: '',
              iterator_selector: ['items'],
              output_selector: ['nested.result'],
              start_node_id: 'child-start',
              subgraph: {
                nodes: [],
                edges: []
              },
              output: {
                variables: []
              }
            }
          } as OFNode
        ],
        edges: []
      }
    })

    const loopNode = new LoopNode(node, variableStore)
    await expect(loopNode.execute(createContext(node, variableStore))).rejects.toThrow()
  })
})
