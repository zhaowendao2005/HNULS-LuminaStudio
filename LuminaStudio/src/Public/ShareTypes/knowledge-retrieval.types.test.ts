import { describe, expect, it } from 'vitest'
import { knowledgeRetrievalResultSchema } from './knowledge-retrieval.types'

describe('knowledge-retrieval shared contract', () => {
  it('exposes the required normalized result fields', () => {
    expect(Object.keys(knowledgeRetrievalResultSchema.properties)).toEqual(
      expect.arrayContaining(['query', 'total_scopes', 'total_hits', 'partial_failure', 'items'])
    )
    expect(knowledgeRetrievalResultSchema.required).toEqual(
      expect.arrayContaining(['query', 'total_scopes', 'total_hits', 'partial_failure', 'items'])
    )
  })
})
