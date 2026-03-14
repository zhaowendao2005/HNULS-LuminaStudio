import { describe, expect, it } from 'vitest'
import { compileOFBlueprintTextDsl, parseOFBlueprintTextDsl } from '.'

describe('OF blueprint text dsl', () => {
  it('parses and compiles OFT/1 section-based dsl', () => {
    const result = compileOFBlueprintTextDsl(`
OFT/1
[workflow]
name = "section-demo"
author = "tester"

[node.start]
type = "start"
inputs = [{"variable":"user_query","schema":{"type":"string","default":"hello"}}]

[node.llm_main]
type = "llm"
model = "openai/gpt-4.1-mini"
prompt = """
请总结输入。
"""
struct = "answer:string"

[node.end]
type = "end"
outputs = [{"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@llm_main.structured_output.answer"}}]

[graph]
edges = ["start.source -> llm_main.target", "llm_main.source -> end.target"]
`)

    expect(result.valid).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.blueprint?.workflow.name).toBe('section-demo')
    expect(result.runnable?.graph.nodes.length).toBeGreaterThan(0)
  })

  it('supports OFT/1 section ast parsing', () => {
    const result = parseOFBlueprintTextDsl(`
OFT/1
[workflow]
name = "json-heredoc"

[node.start]
type = "start"

[node.end]
type = "end"
outputs = [{"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@start.output"}}]

[graph]
edges = ["start.source -> end.target"]
`)

    expect(result.valid).toBe(true)
    expect(result.ast?.format).toBe('oft/1')
    expect(result.ast?.sections.some((section) => section.name === 'workflow')).toBe(true)
  })

  it('rejects legacy BLUEPRINT DSL header', () => {
    const result = compileOFBlueprintTextDsl(`
BLUEPRINT DSL 1.0
[workflow]
name = "legacy"
`)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-header',
          context: 'BLUEPRINT DSL 1.0'
        })
      ])
    )
  })

  it('explains multiline array fragments with a concrete OFT/1 hint', () => {
    const result = compileOFBlueprintTextDsl(`
OFT/1
[workflow]
name = "multiline-array-error"

[node.end]
type = "end"
outputs = [
  {"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@start.output"}}
]

[graph]
edges = ["start.source -> end.target"]
`)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-statement',
          message: expect.stringContaining('OFT/1 不支持多行数组项或多行对象项')
        })
      ])
    )
  })

  it('rejects control edge handles that do not match renderer runtime contract', () => {
    const result = compileOFBlueprintTextDsl(`
OFT/1
[workflow]
name = "invalid-handle-demo"

[node.start]
type = "start"
inputs = [{"variable":"user_query","schema":{"type":"string"}}]

[node.llm_main]
type = "llm"
model = "openai/gpt-4.1-mini"
prompt = "hello"

[node.end]
type = "end"
outputs = [{"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@llm_main.llmoutput"}}]

[graph]
edges = ["start.output -> llm_main.input", "llm_main.output -> end.target"]
`)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'blueprint-validation',
          message: expect.stringContaining('只允许控制流出边 handle')
        }),
        expect.objectContaining({
          code: 'blueprint-validation',
          message: expect.stringContaining('只允许控制流入边 handle')
        })
      ])
    )
  })
})
