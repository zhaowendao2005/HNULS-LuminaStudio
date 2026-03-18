import { describe, expect, it } from 'vitest'
import { paperRetrievalResultSchema } from './paper-retrieval.types'

describe('paper-retrieval shared contract', () => {
  it('exposes the required normalized result fields', () => {
    expect(Object.keys(paperRetrievalResultSchema.properties)).toEqual(
      expect.arrayContaining([
        'query',
        'provider',
        'total_found',
        'returned_count',
        'items',
        'latency_ms'
      ])
    )
    expect(paperRetrievalResultSchema.required).toEqual(
      expect.arrayContaining([
        'query',
        'provider',
        'total_found',
        'returned_count',
        'items',
        'latency_ms'
      ])
    )
  })
})
