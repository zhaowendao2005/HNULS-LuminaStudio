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
    expect(bundle.authoring_defaults.length).toBeGreaterThan(0)
    expect(
      bundle.authoring_defaults.some(
        (item) => item.path === 'graph.nodes[start].data.input.variables[*].default'
      )
    ).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.Start && !item.internal)).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.IterationStart && item.internal)).toBe(
      true
    )
    expect(bundle.prompt_markdown).toContain('OFRunnableWorkflow')
    expect(bundle.prompt_markdown).toContain('`selector[0]` 是变量存储 key')
    expect(bundle.prompt_markdown).toContain('不要输出空 selector 数组')
    expect(bundle.prompt_markdown).toContain('优先补 `default`，让导入后的工作流可以直接运行')
    expect(bundle.prompt_markdown).toContain('`default` 是运行前预填值，不是 `value_selector`')
    expect(bundle.prompt_markdown).toContain('`structured_output.enabled=false` 时不要写 `structured_output.schema:null`')
    expect(bundle.prompt_markdown).toContain('不要把 `loop.output.variables[].type` 写成 `object`')
    expect(bundle.prompt_markdown).not.toContain('```json')
    expect(bundle.annotated_workflow_jsonc).toContain('include `default` so the run panel can prefill runnable values')
    expect(bundle.annotated_workflow_jsonc).toContain('Edge rule: non-ifelse nodes use source -> target')
    expect(bundle.annotated_workflow_jsonc).toContain('do not use [], null, or empty objects as placeholders')
    expect(bundle.bundled_markdown).toContain('Schema Access')
    expect(bundle.bundled_markdown).toContain('bundle.authoring_defaults')
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
      const llmNode = iterationNode.data.subgraph.nodes.find((node) => node.data.type === OFBlockEnum.LLM)
      if (llmNode?.data.type === OFBlockEnum.LLM) {
        expect(llmNode.data.structured_output).not.toHaveProperty('schema')
      }
    }

    const startNode = workflow.graph.nodes.find((node) => node.data.type === OFBlockEnum.Start)
    if (startNode?.data.type === OFBlockEnum.Start) {
      expect(startNode.data.input.variables.every((item) => item.value_selector === undefined)).toBe(true)
      expect(startNode.data.input.variables[0].default).toBe('batch')
      expect(startNode.data.input.variables[1].default).toEqual(['sample-item-1', 'sample-item-2'])
      expect(Array.isArray(startNode.data.input.variables[1].default)).toBe(true)
    }
  })

  it('round-trips the annotated jsonc template through strict runnable parsing', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const parsed = parseRunnableWorkflowJsonc(bundle.annotated_workflow_jsonc)

    expect(parsed.id).toBe(bundle.example.id)
    expect(parsed.graph.edges.every((edge) => edge.targetHandle === 'target')).toBe(true)
  })

  it('keeps generated schema strict around explicit edge handles and reuses defs', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const defs = bundle.schema.$defs
    const positionSchemaRef =
      bundle.schema.properties?.graph?.properties?.nodes?.items?.properties?.position?.$ref
    const edgeSchema = bundle.schema.properties?.graph?.properties?.edges?.items

    expect(defs).toBeTruthy()
    expect(Object.keys(defs || {}).length).toBeGreaterThan(0)
    expect(positionSchemaRef).toMatch(/^#\/\$defs\//)
    expect(edgeSchema.required).toEqual(
      expect.arrayContaining(['sourceHandle', 'targetHandle'])
    )
  })
})
