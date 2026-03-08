import { describe, expect, it } from 'vitest'
import { parseJsonc, stripJsonLineComments } from './orchestraflow-workflow-json'

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

  it('parses jsonc workflow snippets after stripping comments', () => {
    const source = `{
  // 可运行工作流
  "id": "demo",
  "name": "demo",
  "author": "codex",
  "createdAt": 1,
  "updatedAt": 1,
  "status": "draft",
  "graph": {
    "nodes": [],
    "edges": [] // 允许空图例
  }
}`

    const parsed = parseJsonc<{
      id: string
      graph: { nodes: unknown[]; edges: unknown[] }
    }>(source)

    expect(parsed.id).toBe('demo')
    expect(parsed.graph.nodes).toEqual([])
    expect(parsed.graph.edges).toEqual([])
  })
})
