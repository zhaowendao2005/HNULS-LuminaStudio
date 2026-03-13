import { describe, expect, it } from 'vitest'
import {
  compileOFBlueprintTextDsl,
  parseOFBlueprintTextDsl,
  type OFBlueprintWorkflow
} from '.'

describe('OF blueprint text dsl', () => {
  it('parses and compiles a valid text dsl blueprint', () => {
    const result = compileOFBlueprintTextDsl(`
BLUEPRINT DSL 1.0
# 这是一个最小可编译蓝图
SET workflow.name = "demo-blueprint"
SET workflow.author = "test"

NODE start TYPE start
SET start.data.input.variables[0].variable = "user_query"
SET start.data.input.variables[0].label = "user_query"
SET start.data.input.variables[0].type = "string"

NODE llm_main TYPE llm
SET llm_main.data.model.provider = "openai"
SET llm_main.data.model.name = "gpt-4.1-mini"
SET llm_main.data.structured_output.enabled = false
SET llm_main.data.prompt_template[0].id = "prompt-1"
SET llm_main.data.prompt_template[0].role = "user"
SET llm_main.data.prompt_template[0].text <<TEXT
请总结输入。
TEXT

NODE end TYPE end
SET end.data.output.variables[0].variable = "result"
SET end.data.output.variables[0].label = "result"
SET end.data.output.variables[0].type = "string"
SET end.data.output.variables[0].value_selector = ["llm_main.llmoutput"]

EDGE start -> llm_main
EDGE llm_main -> end
`)

    expect(result.valid).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.blueprint?.workflow.name).toBe('demo-blueprint')
    expect(result.runnable?.graph.nodes.length).toBeGreaterThan(0)
  })

  it('supports JSON heredoc values for structured schema fields', () => {
    const result = parseOFBlueprintTextDsl(`
BLUEPRINT DSL 1.0
SET workflow.name = "json-heredoc"
NODE llm_main TYPE llm
SET llm_main.data.model.provider = "openai"
SET llm_main.data.model.name = "gpt-4.1-mini"
SET llm_main.data.structured_output.enabled = true
SET llm_main.data.structured_output.schema <<JSON
{"type":"object","properties":{"answer":{"type":"string"}},"required":["answer"],"additionalProperties":false}
JSON
`)

    expect(result.valid).toBe(true)
    const llmNode = result.ast?.graph.nodes.find((node) => node.id === 'llm_main')
    const schemaAssignment = llmNode?.assignments.find((item) =>
      item.rawPath.includes('structured_output.schema')
    )

    expect(schemaAssignment?.value).toEqual({
      type: 'object',
      properties: {
        answer: {
          type: 'string'
        }
      },
      required: ['answer'],
      additionalProperties: false
    } satisfies Record<string, unknown>)
  })

  it('reports sparse array index with line and error code', () => {
    const result = compileOFBlueprintTextDsl(`
BLUEPRINT DSL 1.0
SET workflow.name = "sparse-array"
NODE llm_main TYPE llm
SET llm_main.data.model.provider = "openai"
SET llm_main.data.model.name = "gpt-4.1-mini"
SET llm_main.data.structured_output.enabled = false
SET llm_main.data.prompt_template[1].role = "user"
`)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'sparse-array-index',
          line: 8
        })
      ])
    )
  })

  it('requires explicit ifelse source handle', () => {
    const result = compileOFBlueprintTextDsl(`
BLUEPRINT DSL 1.0
SET workflow.name = "ifelse-handle"

NODE start TYPE start
SET start.data.input.variables[0].variable = "question"
SET start.data.input.variables[0].label = "question"
SET start.data.input.variables[0].type = "string"

NODE branch TYPE ifelse
SET branch.data.cases[0].id = "case-1"
SET branch.data.cases[0].label = "case-1"
SET branch.data.cases[0].handleId = "case_1"
SET branch.data.cases[0].conditions[0].id = "condition-1"
SET branch.data.cases[0].conditions[0].variable_ref.selector = ["question"]
SET branch.data.cases[0].conditions[0].compare_source_mode = "constant"
SET branch.data.cases[0].conditions[0].operator = "contains"
SET branch.data.cases[0].conditions[0].compare_value = "hi"
SET branch.data.elseCase.handleId = "else"
SET branch.data.elseCase.label = "ELSE"

NODE end TYPE end
SET end.data.output.variables[0].variable = "result"
SET end.data.output.variables[0].label = "result"
SET end.data.output.variables[0].type = "string"
SET end.data.output.variables[0].value_selector = ["question"]

EDGE start -> branch
EDGE branch -> end
`)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-ifelse-handle'
        })
      ])
    )
  })

  it('parses and compiles OFT/1 section-based dsl', () => {
    const result = compileOFBlueprintTextDsl(`
OFT/1
[workflow]
name = "section-demo"
author = "tester"

[input.user_query]
type = "string"
default = "hello"

[node.start]
type = "start"
inputs = ["user_query"]

[node.llm_main]
type = "llm"
model = "openai/gpt-4.1-mini"
prompt = """
请总结输入。
"""
struct = "answer:string"

[node.end]
type = "end"
outputs = ["result:string <- @llm_main.structured_output.answer"]

[graph]
edges = ["start -> llm_main", "llm_main -> end"]
`)

    expect(result.valid).toBe(true)
    expect(result.blueprint?.workflow.name).toBe('section-demo')
    expect(result.runnable?.graph.nodes.length).toBeGreaterThan(0)
  })
})
