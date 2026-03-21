import { describe, expect, it } from 'vitest'
import { compileOFAuthoringTomlDocumentToWorkflow } from './compiler'

describe('authoring-toml compiler', () => {
  it('会保留 knowledge-retrieval 的 rerank_model_id，并允许 rerank_top_n 小于 top_k', () => {
    const workflow = compileOFAuthoringTomlDocumentToWorkflow({
      workflow: {
        name: 'test-workflow'
      },
      nodes: [
        {
          id: 'knowledge_lookup',
          type: 'knowledge-retrieval',
          title: '知识检索',
          query: 'lumina studio',
          scopes: [
            {
              scope_id: 'kb_lumina',
              knowledge_base_id: 1,
              table_name: 'chunks'
            }
          ],
          top_k: 5,
          rerank_model_id: 'rerank-model-1',
          rerank_top_n: 3
        }
      ],
      edges: []
    })

    const node = workflow.graph.nodes[0]
    const data = node.data as {
      rerank_enabled?: boolean
      rerank_model_id?: string | null
      rerank_top_n?: number | null
      top_k?: number
    }

    expect(data.top_k).toBe(5)
    expect(data.rerank_enabled).toBe(true)
    expect(data.rerank_model_id).toBe('rerank-model-1')
    expect(data.rerank_top_n).toBe(3)
  })
})
