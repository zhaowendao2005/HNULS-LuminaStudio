import { describe, expect, it } from 'vitest'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { buildOrchestraflowAISchemaBundle } from '.'

describe('orchestraflow ai schema bundle', () => {
  it('exports all public node types and preserves internal node hints', () => {
    const bundle = buildOrchestraflowAISchemaBundle()

    expect(bundle.format).toBe('orchestraflow-runnable-workflow')
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.Start && !item.internal)).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.LLM && !item.internal)).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.IfElse && !item.internal)).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.Iteration && !item.internal)).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.Loop && !item.internal)).toBe(true)
    expect(
      bundle.nodes.some((item) => item.type === OFBlockEnum.VariableAssign && !item.internal)
    ).toBe(true)
    expect(bundle.nodes.some((item) => item.type === OFBlockEnum.End && !item.internal)).toBe(true)
    expect(
      bundle.nodes.some((item) => item.type === OFBlockEnum.IterationStart && item.internal)
    ).toBe(true)
    expect(bundle.prompt_markdown).toContain('直接输出最终可运行的 `OFWorkflow` JSON')
    expect(bundle.annotated_workflow_jsonc).toContain('// 根图边规则')
    expect(bundle.annotated_workflow_jsonc).toContain('node.type: start | llm | ifelse')
    expect(bundle.bundled_markdown).toContain('"graph"')
    expect(bundle.bundled_markdown).toContain('```jsonc')
  })

  it('exports a runnable workflow example with explicit handles and internal container edges', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const workflow = bundle.example

    expect(workflow.graph.nodes.some((node) => node.data.type === OFBlockEnum.Start)).toBe(true)
    expect(workflow.graph.nodes.some((node) => node.data.type === OFBlockEnum.Iteration)).toBe(true)
    expect(workflow.graph.nodes.some((node) => node.data.type === OFBlockEnum.Loop)).toBe(true)

    const iterationNode = workflow.graph.nodes.find((node) => node.data.type === OFBlockEnum.Iteration)
    expect(iterationNode).toBeTruthy()
    if (iterationNode?.data.type === OFBlockEnum.Iteration) {
      expect(iterationNode.data.subgraph.nodes.some((node) => node.data.type === OFBlockEnum.IterationStart)).toBe(true)
      expect(iterationNode.data.subgraph.edges.length).toBeGreaterThan(0)
      expect(iterationNode.data.subgraph.edges.every((edge) => edge.sourceHandle && edge.targetHandle)).toBe(true)
      expect(iterationNode.data.output.variables[0]?.variable).toBe('result')
    }

    const loopNode = workflow.graph.nodes.find((node) => node.data.type === OFBlockEnum.Loop)
    expect(loopNode).toBeTruthy()
    if (loopNode?.data.type === OFBlockEnum.Loop) {
      expect(loopNode.data.subgraph.nodes.some((node) => node.data.type === OFBlockEnum.LoopStart)).toBe(true)
      expect(loopNode.data.subgraph.edges.length).toBeGreaterThan(0)
      expect(loopNode.data.subgraph.edges.every((edge) => edge.sourceHandle && edge.targetHandle)).toBe(true)
      expect(loopNode.data.output.variables.some((item) => item.variable === 'counter')).toBe(true)
    }

    expect(workflow.graph.edges.every((edge) => edge.sourceHandle && edge.targetHandle)).toBe(true)
  })

  it('tightens schema around handles, nested nodes and selector arrays', () => {
    const bundle = buildOrchestraflowAISchemaBundle()
    const defs = bundle.schema.$defs

    expect(defs.rootEdge.required).toEqual(
      expect.arrayContaining(['sourceHandle', 'targetHandle'])
    )
    expect(defs.subgraphEdge.required).toEqual(
      expect.arrayContaining(['sourceHandle', 'targetHandle'])
    )
    expect(defs.selectorArray.minItems).toBe(1)
    expect(defs.subgraphNode.oneOf.length).toBeGreaterThan(0)
    expect(defs.rootNode.oneOf.length).toBeGreaterThan(0)
  })
})
