import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { OFBlockEnum, OFVarType, type OFNode } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from './workflow-editor.store'

describe('workflow-editor.store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  it('addNode creates container defaults from definitions and inflates internal start nodes', () => {
    const store = useWorkflowEditorStore()

    const iterationNodeId = store.addNode(OFBlockEnum.Iteration)
    const iterationNode = store.findNodeById(iterationNodeId)

    expect(iterationNode?.data.type).toBe(OFBlockEnum.Iteration)
    if (iterationNode?.data.type === OFBlockEnum.Iteration) {
      expect(iterationNode.data.subgraph.nodes).toHaveLength(1)
      expect(iterationNode.data.subgraph.nodes[0].data.type).toBe(OFBlockEnum.IterationStart)
      expect(store.nodes.some((node) => node.parentNode === iterationNodeId)).toBe(true)
    }

    const loopNodeId = store.addNode(OFBlockEnum.Loop)
    const loopNode = store.findNodeById(loopNodeId)
    expect(loopNode?.data.type).toBe(OFBlockEnum.Loop)
    if (loopNode?.data.type === OFBlockEnum.Loop) {
      expect(loopNode.data.subgraph.nodes[0].data.type).toBe(OFBlockEnum.LoopStart)
    }

    vi.runOnlyPendingTimers()
  })

  it('setNodes normalizes node data through definitions', () => {
    const store = useWorkflowEditorStore()
    const rawNode: OFNode = {
      id: 'node_llm_raw',
      type: 'llm',
      position: { x: 0, y: 0 },
      data: {
        type: OFBlockEnum.LLM,
        title: '  Hello World  ',
        desc: '',
        model: { provider: '', name: '' },
        prompt_template: [],
        structured_output: {
          enabled: true,
          schema: {
            type: 'object',
            properties: {
              answer: { type: 'string' }
            },
            required: ['answer'],
            additionalProperties: false
          }
        },
        output: { variables: [] }
      }
    } as OFNode

    store.setNodes([rawNode])

    const normalized = store.findNodeById('node_llm_raw')
    expect(normalized?.data.type).toBe(OFBlockEnum.LLM)
    if (normalized?.data.type === OFBlockEnum.LLM) {
      expect(normalized.data.title).toBe('hello_world')
      expect(normalized.data.output.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            variable: 'llmoutput',
            type: OFVarType.String
          }),
          expect.objectContaining({
            variable: 'structured_output',
            type: OFVarType.Object
          })
        ])
      )
    }
  })
})
