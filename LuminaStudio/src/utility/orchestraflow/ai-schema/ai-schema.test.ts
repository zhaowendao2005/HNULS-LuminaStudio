import { describe, expect, it } from 'vitest'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { buildOrchestraflowAISchemaBundle } from '.'
import { parseRunnableWorkflowJsonc } from '@main/services/orchestraflow/orchestraflow-workflow-json'

describe('orchestraflow ai schema bundle', () => {
  it('exports runtime node contracts and compact prompt content', () => {
    const bundle = buildOrchestraflowAISchemaBundle()

    expect(bundle.format).toBe('orchestraflow-runnable-workflow')
    expect(bundle.authoring_contract.root_type).toBe('OFRunnableWorkflow')
    expect(bundle.authoring_contract.selector_contract.representation).toBe('store-key-array')
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.Start && !item.internal)).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.IterationStart && item.internal)).toBe(
      true
    )
    expect(bundle.prompt_markdown).toContain('OFRunnableWorkflow')
    expect(bundle.prompt_markdown).toContain('`selector[0]` 是变量存储 key')
    expect(bundle.prompt_markdown).not.toContain('```json')
    expect(bundle.annotated_workflow_jsonc).toContain('根图/子图边规则')
    expect(bundle.bundled_markdown).toContain('Schema Access')
  })

  it('exports a compact runnable workflow example with explicit handles and iteration subgraph edges', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const workflow = bundle.example

    expect(workflow.graph.nodes.some((node) => node.data.type === OFBlockEnum.Start)).toBe(true)
    expect(workflow.graph.nodes.some((node) => node.data.type === OFBlockEnum.Iteration)).toBe(true)
    expect(workflow.graph.edges.every((edge) => edge.sourceHandle && edge.targetHandle)).toBe(true)

    const iterationNode = workflow.graph.nodes.find((node) => node.data.type === OFBlockEnum.Iteration)
    expect(iterationNode).toBeTruthy()
    if (iterationNode?.data.type === OFBlockEnum.Iteration) {
      expect(
        iterationNode.data.subgraph.nodes.some((node) => node.data.type === OFBlockEnum.IterationStart)
      ).toBe(true)
      expect(iterationNode.data.subgraph.edges.length).toBeGreaterThan(0)
      expect(iterationNode.data.subgraph.edges.every((edge) => edge.sourceHandle === 'source')).toBe(
        true
      )
      expect(iterationNode.data.output_selector).toEqual(['summarize_item.llmoutput'])
    }
  })

  it('round-trips the annotated jsonc template through strict runnable parsing', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const parsed = parseRunnableWorkflowJsonc(bundle.annotated_workflow_jsonc)

    expect(parsed.id).toBe(bundle.example.id)
    expect(parsed.graph.edges.every((edge) => edge.targetHandle === 'target')).toBe(true)
  })

  it('keeps generated schema strict around explicit edge handles', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const edgeSchema = bundle.schema.properties?.graph?.properties?.edges?.items

    expect(edgeSchema.required).toEqual(
      expect.arrayContaining(['sourceHandle', 'targetHandle'])
    )
  })
})
