import { describe, expect, it, vi } from 'vitest'
import { OFBlockEnum, type OFNode } from '@shared/Orchestraflow-types'
import { IterationNode } from './iteration-node'
import { VariableStore } from '../services/variable-store'
import type { ExecutionContext } from './types'

function createIterationGraph(): { nodes: OFNode[]; edges: any[] } {
  return {
    nodes: [
      {
        id: 'child-start',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          type: OFBlockEnum.IterationStart,
          title: 'Iteration Start',
          desc: ''
        }
      } as OFNode
    ],
    edges: []
  }
}

function createIterationNodeDefinition(overrides: Record<string, any> = {}): OFNode {
  return {
    id: 'iter1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.Iteration,
      title: 'Loop',
      desc: '',
      iterator_selector: ['items'],
      output_selector: ['loop.item'],
      start_node_id: 'child-start',
      subgraph: createIterationGraph(),
      parallel_mode: 'sequential',
      error_handle_mode: 'terminated',
      flatten_output: false,
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

describe('IterationNode', () => {
  it('顺序模式会注入 item/index 并按原顺序聚合', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', ['a', 'b'])
    const node = createIterationNodeDefinition()
    const executeGraph = vi.fn(async ({ variableStore: childStore, iterationContext }) => {
      expect(childStore.get('loop.item')).toBe(iterationContext?.item)
      expect(childStore.get('loop.index')).toBe(iterationContext?.index)
      expect(childStore.get('iter1.item')).toBe(iterationContext?.item)
      expect(childStore.get('iter1.index')).toBe(iterationContext?.index)
      return { status: 'succeeded' as const }
    })

    const iterationNode = new IterationNode(node, variableStore)
    const result = await iterationNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual(['a', 'b'])
    expect(executeGraph).toHaveBeenCalledTimes(2)
  })

  it('并行模式会保持结果槽位与原始索引一致', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', [1, 2, 3])
    const node = createIterationNodeDefinition({
      parallel_mode: 'parallel',
      parallel_nums: 3
    })
    const executeGraph = vi.fn(async ({ variableStore: childStore, iterationContext }) => {
      const index = iterationContext?.index || 0
      await new Promise((resolve) => setTimeout(resolve, (3 - index) * 10))
      childStore.set('loop.item', index + 1)
      return { status: 'succeeded' as const }
    })

    const iterationNode = new IterationNode(node, variableStore)
    const result = await iterationNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual([1, 2, 3])
  })

  it('continue-on-error 会把失败项写成 null 并继续执行', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', [1, 2, 3])
    const node = createIterationNodeDefinition({
      error_handle_mode: 'continue-on-error'
    })
    const executeGraph = vi.fn(async ({ iterationContext }) => {
      if (iterationContext?.index === 1) {
        return { status: 'failed' as const, error: 'boom' }
      }
      return { status: 'succeeded' as const }
    })

    const iterationNode = new IterationNode(node, variableStore)
    const result = await iterationNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual([1, null, 3])
    expect(executeGraph).toHaveBeenCalledTimes(3)
  })

  it('remove-abnormal-output 会在最终聚合阶段过滤 null', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', [1, 2, 3])
    const node = createIterationNodeDefinition({
      error_handle_mode: 'remove-abnormal-output'
    })
    const executeGraph = vi.fn(async ({ iterationContext }) => {
      if (iterationContext?.index === 1) {
        return { status: 'failed' as const, error: 'boom' }
      }
      return { status: 'succeeded' as const }
    })

    const iterationNode = new IterationNode(node, variableStore)
    const result = await iterationNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual([1, 3])
  })

  it('terminated 并行模式会停止继续派发但等待已派发项落定', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', [0, 1, 2, 3])
    const node = createIterationNodeDefinition({
      parallel_mode: 'parallel',
      parallel_nums: 2,
      error_handle_mode: 'terminated'
    })
    const seen: number[] = []
    const executeGraph = vi.fn(async ({ iterationContext }) => {
      const index = iterationContext?.index || 0
      seen.push(index)
      if (index === 0) {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      if (index === 1) {
        return { status: 'failed' as const, error: 'boom' }
      }
      return { status: 'succeeded' as const }
    })

    const iterationNode = new IterationNode(node, variableStore)
    const result = await iterationNode.execute(createContext(node, variableStore, { executeGraph }))

    expect(result.error).toBe('boom')
    expect(seen).toEqual([0, 1])
  })

  it('output_selector 缺值时返回 null，不视为整次失败', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', ['x', 'y'])
    const node = createIterationNodeDefinition({
      output_selector: ['missing.value']
    })

    const iterationNode = new IterationNode(node, variableStore)
    const result = await iterationNode.execute(createContext(node, variableStore))

    expect(result.error).toBeUndefined()
    expect(result.outputs.result).toEqual([null, null])
  })

  it('flatten_output 仅在所有非 null 输出都是数组时做一层展开', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', [[1], [2]])
    const arrayNode = createIterationNodeDefinition({
      flatten_output: true
    })
    const arrayIteration = new IterationNode(arrayNode, variableStore)
    const arrayResult = await arrayIteration.execute(createContext(arrayNode, variableStore))
    expect(arrayResult.outputs.result).toEqual([1, 2])

    const mixedStore = new VariableStore()
    mixedStore.set('items', [[1], 'x'])
    const mixedNode = createIterationNodeDefinition({
      flatten_output: true
    })
    const mixedIteration = new IterationNode(mixedNode, mixedStore)
    const mixedResult = await mixedIteration.execute(createContext(mixedNode, mixedStore))
    expect(mixedResult.outputs.result).toEqual([[1], 'x'])
  })

  it('非法配置会直接硬失败', async () => {
    const variableStore = new VariableStore()
    variableStore.set('items', [1])
    const node = createIterationNodeDefinition({
      output_selector: [],
      subgraph: {
        nodes: [
          ...createIterationGraph().nodes,
          {
            id: 'nested-iter',
            type: 'default',
            position: { x: 10, y: 10 },
            data: {
              type: OFBlockEnum.Iteration,
              title: 'Nested',
              desc: '',
              iterator_selector: ['items'],
              output_selector: ['nested.result'],
              start_node_id: 'child-start',
              subgraph: createIterationGraph()
            }
          } as OFNode
        ],
        edges: []
      }
    })

    const iterationNode = new IterationNode(node, variableStore)
    await expect(iterationNode.execute(createContext(node, variableStore))).rejects.toThrow()
  })
})
