import { describe, expect, it } from 'vitest'
import { KnowledgeDatabaseBridgeService } from '../knowledge-database-bridge/knowledge-database-bridge-service'
import { KnowledgeRetrievalService } from './knowledge-retrieval-service'

const integrationBaseUrl = process.env.KD_INTEGRATION_BASE_URL?.trim()
const integrationKnowledgeBaseId = Number(process.env.KD_INTEGRATION_KNOWLEDGE_BASE_ID || '')
const integrationQuery = process.env.KD_INTEGRATION_QUERY?.trim()

const shouldRunIntegration =
  Boolean(integrationBaseUrl) &&
  Number.isInteger(integrationKnowledgeBaseId) &&
  integrationKnowledgeBaseId > 0 &&
  Boolean(integrationQuery)

const itIf = shouldRunIntegration ? it : it.skip

describe('knowledge-retrieval integration', () => {
  itIf('connects to the real KnowledgeDatabase REST service end-to-end', async () => {
    const bridge = new KnowledgeDatabaseBridgeService({
      baseUrl: integrationBaseUrl!,
      timeout: 30000
    })
    const service = new KnowledgeRetrievalService(bridge)

    const result = await service.search({
      knowledgeBaseId: integrationKnowledgeBaseId,
      query: integrationQuery!,
      permissionTree: {
        providers: [],
        knowledgeBaseId: integrationKnowledgeBaseId,
        effect: 'allow'
      },
      k: 5
    })

    expect(result.query).toBe(integrationQuery)
    expect(result.knowledgeBaseId).toBe(integrationKnowledgeBaseId)
    expect(Array.isArray(result.resolvedScopes)).toBe(true)
    expect(Array.isArray(result.scopeResults)).toBe(true)
    expect(Array.isArray(result.hits)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
  })
})
