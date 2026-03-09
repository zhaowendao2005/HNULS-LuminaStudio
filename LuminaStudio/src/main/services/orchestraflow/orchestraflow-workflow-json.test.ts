import { describe, expect, it } from 'vitest'
import {
  parseJsonc,
  parseRunnableWorkflowJsonc,
  stripJsonLineComments
} from './orchestraflow-workflow-json'

describe('orchestraflow workflow jsonc helpers', () => {
  it('strips full-line and inline // comments', () => {
    const source = `{
  // 顶层注释
  "id": "demo", // 行尾注释
  "name": "demo"
}`

    expect(stripJsonLineComments(source)).toBe(`{
  
  "id": "demo", 
  "name": "demo"
}`)
  })

  it('keeps // inside strings intact', () => {
    const source = `{
  "url": "https://example.com/api",
  "text": "query // not a comment"
}`

    const parsed = parseJsonc<{ url: string; text: string }>(source)
    expect(parsed.url).toBe('https://example.com/api')
    expect(parsed.text).toBe('query // not a comment')
  })

  it('parses strict runnable workflow snippets after stripping comments', () => {
    const source = `{
  // 严格可运行工作流
  "id": "demo",
  "name": "demo",
  "author": "codex",
  "createdAt": 1,
  "updatedAt": 1,
  "status": "draft",
  "graph": {
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "position": { "x": 0, "y": 0 },
        "data": {
          "title": "start",
          "desc": "",
          "type": "start",
          "input": {
            "variables": [{ "variable": "input", "type": "string", "required": true }]
          }
        }
      },
      {
        "id": "end",
        "type": "end",
        "position": { "x": 320, "y": 0 },
        "data": {
          "title": "end",
          "desc": "",
          "type": "end",
          "output": {
            "variables": [{ "variable": "input", "type": "string", "value_selector": ["input"] }]
          }
        }
      }
    ],
    "edges": [
      {
        "id": "edge_start_end",
        "source": "start",
        "target": "end",
        "sourceHandle": "source",
        "targetHandle": "target"
      } // 严格要求显式 handle
    ]
  }
}`

    const parsed = parseRunnableWorkflowJsonc(source)
    expect(parsed.id).toBe('demo')
    expect(parsed.graph.edges[0].sourceHandle).toBe('source')
  })

  it('rejects runnable workflows with missing edge handles', () => {
    const source = `{
  "id": "demo",
  "name": "demo",
  "author": "codex",
  "createdAt": 1,
  "updatedAt": 1,
  "status": "draft",
  "graph": {
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "position": { "x": 0, "y": 0 },
        "data": {
          "title": "start",
          "desc": "",
          "type": "start",
          "input": { "variables": [{ "variable": "input", "type": "string", "required": true }] }
        }
      },
      {
        "id": "end",
        "type": "end",
        "position": { "x": 320, "y": 0 },
        "data": {
          "title": "end",
          "desc": "",
          "type": "end",
          "output": { "variables": [{ "variable": "input", "type": "string", "value_selector": ["input"] }] }
        }
      }
    ],
    "edges": [{ "id": "edge_start_end", "source": "start", "target": "end" }]
  }
}`

    expect(() => parseRunnableWorkflowJsonc(source)).toThrow(/sourceHandle/)
  })
})
