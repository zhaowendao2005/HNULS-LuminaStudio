import { afterEach, describe, expect, it } from 'vitest'
import type { OFNode } from '@shared/Orchestraflow-types'
import type { ExecutionContext } from './types'
import { KnowledgeRetrievalNode } from './knowledge-retrieval-node'
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
    id: 'knowledge-node-1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'knowledge-retrieval',
      title: 'Knowledge Retrieval',
      desc: '',
      permission_tree: {
        providers: [],
        knowledgeBaseId: 1,
        effect: 'allow'
      },
      output: { variables: [] },
      ...overrides
    }
  } as OFNode
}

function createContext(node: OFNode, variableStore: VariableStore): ExecutionContext {
  return {
    runId: 'run-knowledge',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: {
      query: 'lumina studio'
    },
    variables: variableStore.getAll(),
    scopePath: [],
    traceKey: 'trace-knowledge',
    providerConfigs: {},
    executeGraph: async () => ({ status: 'succeeded' }),
    isStopped: () => false
  }
}

afterEach(() => {
  Reflect.deleteProperty(process, 'parentPort')
})

describe('KnowledgeRetrievalNode', () => {
  it('通过 private RPC 调用知识检索并整理固定输出字段', async () => {
    const port = new MockParentPort()
    Object.defineProperty(process, 'parentPort', {
      value: port,
      configurable: true
    })

    const store = new VariableStore()
    const node = createNode()
    const runtimeNode = new KnowledgeRetrievalNode(node, store)
    const execution = runtimeNode.execute(createContext(node, store))

    const request = port.sentMessages[0] as {
      type: string
      requestId: string
      channel: string
      payload: Record<string, unknown>
    }

    expect(request.type).toBe('private-rpc:request')
    expect(request.channel).toBe('knowledge:retrieve')
    expect(request.payload.query).toBe('lumina studio')
    expect(request.payload.knowledgeBaseIds).toEqual([1])
    expect(request.payload.knowledgeBaseId).toBe(1)

    port.emit({
      type: 'private-rpc:response',
      requestId: request.requestId,
      channel: 'knowledge:retrieve',
      success: true,
      payload: {
        query: 'lumina studio',
        resolvedScopes: [{ scope: 'a' }, { scope: 'b' }],
        hits: [{ id: 'hit-1' }, { id: 'hit-2' }],
        errors: [{ code: 'PARTIAL', message: 'partial failed' }]
      }
    })

    const result = await execution

    expect(result.error).toBeUndefined()
    expect(result.outputs).toEqual({
      query: 'lumina studio',
      total_scopes: 2,
      total_hits: 2,
      partial_failure: true,
      items: [{ id: 'hit-1' }, { id: 'hit-2' }],
      result: {
        query: 'lumina studio',
        total_scopes: 2,
        total_hits: 2,
        partial_failure: true,
        items: [{ id: 'hit-1' }, { id: 'hit-2' }]
      }
    })
    expect(store.get('query')).toBe('lumina studio')
    expect(store.get('total_scopes')).toBe(2)
    expect(store.get('partial_failure')).toBe(true)
  })

  it('缺少 result 时会基于固定字段生成兜底结果字符串', async () => {
    const port = new MockParentPort()
    Object.defineProperty(process, 'parentPort', {
      value: port,
      configurable: true
    })

    const store = new VariableStore()
    const node = createNode()
    const runtimeNode = new KnowledgeRetrievalNode(node, store)
    const execution = runtimeNode.execute(createContext(node, store))

    const request = port.sentMessages[0] as { requestId: string }
    port.emit({
      type: 'private-rpc:response',
      requestId: request.requestId,
      channel: 'knowledge:retrieve',
      success: true,
      payload: {
        hits: [{ id: 'hit-1' }]
      }
    })

    const result = await execution

    expect(result.error).toBeUndefined()
    expect(result.outputs.query).toBe('lumina studio')
    expect(result.outputs.total_scopes).toBe(0)
    expect(result.outputs.total_hits).toBe(1)
    expect(result.outputs.partial_failure).toBe(false)
    expect(result.outputs.items).toEqual([{ id: 'hit-1' }])
    expect(result.outputs.result).toEqual({
      query: 'lumina studio',
      total_scopes: 0,
      total_hits: 1,
      partial_failure: false,
      items: [{ id: 'hit-1' }]
    })
  })
})
