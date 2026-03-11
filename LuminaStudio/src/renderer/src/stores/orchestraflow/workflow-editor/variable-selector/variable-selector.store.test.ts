import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { OFBlockEnum, OFVarType } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '../workflow-editor.store'
import { useVariableSelectorStore } from './variable-selector.store'

describe('variable-selector.store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  it('derives visible upstream variables from node definitions', () => {
    const editorStore = useWorkflowEditorStore()
    const selectorStore = useVariableSelectorStore()

    const startId = editorStore.addNode(OFBlockEnum.Start)
    editorStore.updateNode(startId, {
      input: {
        variables: [
          {
            variable: 'topic',
            label: 'topic',
            type: OFVarType.String,
            required: true
          }
        ]
      }
    })

    const llmId = editorStore.addNode(OFBlockEnum.LLM)
    editorStore.updateNode(llmId, {
      title: 'Summarize Item',
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
      }
    })

    const endId = editorStore.addNode(OFBlockEnum.End)
    editorStore.setEdges([
      {
        id: 'edge_start_llm',
        source: startId,
        target: llmId,
        sourceHandle: 'source',
        targetHandle: 'target'
      },
      {
        id: 'edge_llm_end',
        source: llmId,
        target: endId,
        sourceHandle: 'source',
        targetHandle: 'target'
      }
    ])

    selectorStore.openSelector(endId, 'output')

    const groupTitles = selectorStore.availableGroups.map((group) => group.title)
    expect(groupTitles).toEqual(expect.arrayContaining(['开始', 'summarize_item', 'SYSTEM']))

    const paths = selectorStore.availableVariables.map((item) => item.path)
    expect(paths).toEqual(
      expect.arrayContaining([
        'topic',
        `${llmId}.llmoutput`,
        `${llmId}.structured_output`
      ])
    )

    vi.runOnlyPendingTimers()
  })
})
