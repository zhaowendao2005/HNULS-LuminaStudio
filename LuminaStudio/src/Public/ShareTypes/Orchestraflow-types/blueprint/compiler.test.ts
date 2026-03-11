import { describe, expect, it } from 'vitest'
import type { OFEndNodeData, OFIterationNodeData } from '..'
import { OFBlockEnum, OFVarType } from '..'
import { applyOFBlueprintEditOperation, compileOFBlueprintToRunnable, validateOFBlueprint } from '.'
import type { OFBlueprintWorkflow } from './types'

function createBlueprint(): OFBlueprintWorkflow {
  return {
    version: '2.0',
    workflow: {
      name: 'demo-blueprint',
      author: 'test'
    },
    nodes: [
      {
        id: 'start',
        type: OFBlockEnum.Start,
        config: {
          input: {
            variables: [
              {
                variable: 'items',
                label: 'items',
                type: OFVarType.Array,
                default: ['a']
              }
            ]
          }
        }
      },
      {
        id: 'iterate',
        type: OFBlockEnum.Iteration,
        title: 'iterate',
        config: {
          iterator_selector: ['items'],
          output_selector: ['summarize.llmoutput']
        },
        subgraph: {
          nodes: [
            {
              id: 'summarize',
              type: OFBlockEnum.LLM,
              title: 'summarize',
              config: {
                model: { provider: 'openai', name: 'gpt-4o-mini' },
                prompt_template: [
                  {
                    id: 'prompt-1',
                    role: 'user',
                    text: 'hello'
                  }
                ],
                structured_output: { enabled: false }
              }
            }
          ],
          edges: []
        }
      },
      {
        id: 'end',
        type: OFBlockEnum.End,
        config: {
          output: {
            variables: [
              {
                variable: 'result',
                label: 'result',
                type: OFVarType.Array,
                value_selector: ['iterate.result']
              }
            ]
          }
        }
      }
    ],
    edges: [
      {
        from: { node: 'start', handle: 'source' },
        to: { node: 'iterate', handle: 'target' }
      },
      {
        from: { node: 'iterate', handle: 'source' },
        to: { node: 'end', handle: 'target' }
      }
    ]
  }
}

describe('OF blueprint compiler/edit helpers', () => {
  it('validates and compiles blueprint workflow into runnable workflow', () => {
    const blueprint = createBlueprint()
    const validation = validateOFBlueprint(blueprint)
    expect(validation.valid).toBe(true)

    const runnable = compileOFBlueprintToRunnable(blueprint)
    const iterationNode = runnable.graph.nodes.find(
      (node) => node.data.type === OFBlockEnum.Iteration
    )
    expect(iterationNode).toBeTruthy()
    expect((iterationNode?.data as OFIterationNodeData | undefined)?.start_node_id).toContain(
      'iterate'
    )
  })

  it('propagates node rename through edges and selectors', () => {
    const blueprint = createBlueprint()
    const renamed = applyOFBlueprintEditOperation(blueprint, {
      type: 'rename-node',
      nodeId: 'iterate',
      nextNodeId: 'iterate_v2'
    })

    expect(renamed.edges[0].to.node).toBe('iterate_v2')
    expect(renamed.edges[1].from.node).toBe('iterate_v2')
    expect(
      ((renamed.nodes[2].config.output as OFEndNodeData['output'])?.variables?.[0].value_selector ||
        [])[0]
    ).toBe('iterate_v2.result')
  })
})
