import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  OFBlockEnum,
  OFVarType,
  resolveOFNodeDefinition,
  type OFLLMNodeData,
  type OFNode
} from '@shared/Orchestraflow-types'
import { LLMNode } from './llm-node'
import { VariableStore } from '../services/variable-store'
import type { ExecutionContext } from './types'

function createLLMNode(mode?: 'chat-completions' | 'responses'): LLMNode {
  const node: OFNode = {
    id: 'llm-1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.LLM,
      title: 'LLM',
      desc: '',
      model: {
        provider: 'openai',
        name: 'gpt-test',
        mode
      },
      prompt_template: [],
      structured_output: {
        enabled: false,
        schema: null
      },
      output: {
        variables: []
      }
    }
  } as OFNode

  return new LLMNode(node, new VariableStore())
}

function createExecutionContext(node: OFNode): ExecutionContext {
  return {
    runId: 'run-1',
    node,
    graph: { nodes: [node], edges: [] },
    inputs: { input: 'fallback input' },
    variables: {},
    scopePath: [],
    traceKey: 'trace-1',
    providerConfigs: {
      openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test',
        enabled: true,
        defaultHeaders: {
          'OpenAI-Beta': 'responses'
        }
      }
    },
    executeGraph: async () => ({ status: 'failed', error: 'not implemented' }),
    isStopped: () => false
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LLMNode structured output schema', () => {
  it('supports object structured output schemas', () => {
    const node = createLLMNode()
    const schema = (node as any).buildZodSchema({
      type: 'object',
      properties: {
        title: { type: 'string' },
        score: { type: 'number' }
      },
      required: ['title'],
      additionalProperties: false
    })

    expect(schema.parse({ title: 'alpha', score: 1 })).toEqual({ title: 'alpha', score: 1 })
    expect(() => schema.parse({ score: 1 })).toThrow()
  })

  it('supports nested object schemas', () => {
    const node = createLLMNode()
    const schema = (node as any).buildZodSchema({
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name'],
          additionalProperties: false
        }
      },
      required: ['profile'],
      additionalProperties: false
    })

    expect(
      schema.parse({
        profile: {
          name: 'Lumina'
        }
      })
    ).toEqual({
      profile: {
        name: 'Lumina'
      }
    })
    expect(() => schema.parse({ profile: {} })).toThrow()
  })

  it('marks structured_output as object when schema root is object', () => {
    const variables =
      resolveOFNodeDefinition(OFBlockEnum.LLM).variables.buildRuntimeOutputVariables?.({
        title: 'llm',
        structuredOutput: {
          enabled: true,
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name'],
            additionalProperties: false
          }
        }
      }) || []

    const structuredOutput = variables.find((item) => item.variable === 'structured_output')
    expect(structuredOutput?.type).toBe(OFVarType.Object)
  })

  it('uses OpenAI responses mode for plain text requests', async () => {
    const node = createLLMNode('responses')
    const nodeData = ((node as any).context.node as OFNode).data as OFLLMNodeData
    nodeData.prompt_template = [
      { id: 'system-1', role: 'system', text: 'You are concise.' },
      { id: 'user-1', role: 'user', text: 'Hello Lumina' }
    ]

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'resp_1',
        model: 'gpt-test',
        status: 'completed',
        output_text: 'Hello Lumina',
        usage: {
          input_tokens: 12,
          output_tokens: 4,
          total_tokens: 16
        }
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await node.execute(createExecutionContext((node as any).context.node as OFNode))

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer sk-test',
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'responses'
    })

    const body = JSON.parse(String(init.body))
    expect(body.instructions).toBe('You are concise.')
    expect(body.input).toEqual([
      {
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello Lumina' }]
      }
    ])
    expect(result.outputs.llmoutput).toBe('Hello Lumina')
    expect(result.outputs.usage_metadata).toEqual({
      input_tokens: 12,
      output_tokens: 4,
      total_tokens: 16
    })
  })

  it('parses structured output from OpenAI responses mode', async () => {
    const node = createLLMNode('responses')
    const runtimeNode = (node as any).context.node as OFNode
    ;(runtimeNode.data as OFLLMNodeData).prompt_template = [
      { id: 'user-1', role: 'user', text: 'Return JSON' }
    ]
    ;(runtimeNode.data as OFLLMNodeData).structured_output = {
      enabled: true,
      schema: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          score: { type: 'number' }
        },
        required: ['answer'],
        additionalProperties: false
      }
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'resp_2',
        model: 'gpt-test',
        status: 'completed',
        output_text: '{"answer":"ok","score":0.9}',
        usage: {
          input_tokens: 18,
          output_tokens: 6,
          total_tokens: 24
        }
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await node.execute(createExecutionContext(runtimeNode))

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init.body))
    expect(body.text).toMatchObject({
      format: {
        type: 'json_schema',
        name: 'structured_output',
        strict: true
      }
    })
    expect(result.outputs.structured_output).toEqual({ answer: 'ok', score: 0.9 })
    expect(result.outputs.llmoutput).toBe('{"answer":"ok","score":0.9}')
  })
})
