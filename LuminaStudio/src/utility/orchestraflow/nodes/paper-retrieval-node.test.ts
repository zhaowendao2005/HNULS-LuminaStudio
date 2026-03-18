import { afterEach, describe, expect, it } from 'vitest'
import type { OFNode } from '@shared/Orchestraflow-types'
import type { ExecutionContext } from './types'
import { PaperRetrievalNode } from './paper-retrieval-node'
import { VariableStore } from '../services/variable-store'

class MockParentPort {
  private listeners = new Set<(event: { data: unknown }) => void>()
  public sentMessages: unknown[] = []

  postMessage(message: unknown) {
    this.sentMessages.push(message)
  }

  on(_event: 'message', listener: (event: { data: unknown }) => void) {
    this.listeners.add(listener)
  }

  off(_event: 'message', listener: (event: { data: unknown }) => void) {
    this.listeners.delete(listener)
  }

  emit(message: unknown) {
    for (const listener of this.listeners) {
      listener({ data: message })
    }
  }
}

function createNode(overrides: Record<string, unknown> = {}): OFNode {
  return {
    id: 'paper-node-1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'paper-retrieval',
      title: 'Paper Retrieval',
      desc: '',
      provider: 'pubmed',
      output: { variables: [] },
      ...overrides
    }
  } as OFNode
}

function createContext(node: OFNode, variableStore: VariableStore): ExecutionContext {
  return {
    runId: 'run-paper',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: {
      query: 'cancer biomarkers',
      provider: 'pubmed'
    },
    variables: variableStore.getAll(),
    scopePath: [],
    traceKey: 'trace-paper',
    providerConfigs: {},
    executeGraph: async () => ({ status: 'succeeded' }),
    isStopped: () => false
  }
}

afterEach(() => {
  Reflect.deleteProperty(process, 'parentPort')
})

describe('PaperRetrievalNode', () => {
  it('通过 private RPC 调用论文检索并输出固定字段', async () => {
    const port = new MockParentPort()
    Object.defineProperty(process, 'parentPort', {
      value: port,
      configurable: true
    })

    const store = new VariableStore()
    const node = createNode()
    const runtimeNode = new PaperRetrievalNode(node, store)
    const execution = runtimeNode.execute(createContext(node, store))

    const request = port.sentMessages[0] as {
      type: string
      requestId: string
      channel: string
      payload: Record<string, unknown>
    }

    expect(request.type).toBe('private-rpc:request')
    expect(request.channel).toBe('paper:retrieve')
    expect(request.payload.query).toBe('cancer biomarkers')
    expect(request.payload.provider).toBe('pubmed')

    port.emit({
      type: 'private-rpc:response',
      requestId: request.requestId,
      success: true,
      payload: {
        query: 'cancer biomarkers',
        provider: 'pubmed',
        total_found: 18,
        returned_count: 5,
        items: [{ uid: '1' }, { uid: '2' }],
        latency_ms: 123,
        result: 'paper-result'
      }
    })

    const result = await execution

    expect(result.error).toBeUndefined()
    expect(result.outputs).toEqual({
      query: 'cancer biomarkers',
      provider: 'pubmed',
      total_found: 18,
      returned_count: 5,
      items: [{ uid: '1' }, { uid: '2' }],
      latency_ms: 123,
      result: 'paper-result'
    })
    expect(store.get('provider')).toBe('pubmed')
    expect(store.get('latency_ms')).toBe(123)
  })

  it('RPC 返回缺省数值时会自动按 items 长度补齐', async () => {
    const port = new MockParentPort()
    Object.defineProperty(process, 'parentPort', {
      value: port,
      configurable: true
    })

    const store = new VariableStore()
    const node = createNode({ provider: 'semantic-scholar' })
    const context = createContext(node, store)
    context.inputs = {
      query: 'graph neural networks'
    }

    const runtimeNode = new PaperRetrievalNode(node, store)
    const execution = runtimeNode.execute(context)

    const request = port.sentMessages[0] as { requestId: string }
    port.emit({
      type: 'private-rpc:response',
      requestId: request.requestId,
      success: true,
      payload: {
        provider: 'semantic-scholar',
        items: [{ uid: 'a' }, { uid: 'b' }]
      }
    })

    const result = await execution

    expect(result.error).toBeUndefined()
    expect(result.outputs.query).toBe('graph neural networks')
    expect(result.outputs.provider).toBe('semantic-scholar')
    expect(result.outputs.total_found).toBe(2)
    expect(result.outputs.returned_count).toBe(2)
    expect(result.outputs.latency_ms).toBe(0)
    expect(typeof result.outputs.result).toBe('string')
  })
})
