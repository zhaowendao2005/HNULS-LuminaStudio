import { describe, expect, it } from 'vitest'
import {
  buildLLMOutputVariables,
  OFBlockEnum,
  OFVarType,
  type OFNode
} from '@shared/Orchestraflow-types'
import { LLMNode } from './llm-node'
import { VariableStore } from '../services/variable-store'

function createLLMNode(): LLMNode {
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
        name: 'gpt-test'
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

describe('LLMNode structured output schema', () => {
  it('supports array<object> structured output schemas', () => {
    const node = createLLMNode()
    const schema = (node as any).buildZodSchema({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          score: { type: 'number' }
        },
        required: ['title'],
        additionalProperties: false
      }
    })

    expect(schema.parse([{ title: 'alpha', score: 1 }])).toEqual([{ title: 'alpha', score: 1 }])
    expect(() => schema.parse([{ score: 1 }])).toThrow()
  })

  it('marks structured_output as array when schema root is array<object>', () => {
    const variables = buildLLMOutputVariables('llm', {
      enabled: true,
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name'],
          additionalProperties: false
        }
      }
    })

    const structuredOutput = variables.find((item) => item.variable === 'structured_output')
    expect(structuredOutput?.type).toBe(OFVarType.Array)
  })
})
