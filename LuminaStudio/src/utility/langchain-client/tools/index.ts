import type { LangchainClientAgentCreateConfig } from '@shared/langchain-client.types'
import { createKnowledgeSearchTool } from './retrieval-tool'

export function buildAgentTools(params: {
  knowledgeApiUrl: string
  getRetrievalConfig: () => LangchainClientAgentCreateConfig['retrieval']
}): any[] {
  const tools: any[] = []

  // Always register the tool in agent mode; tool will guide user if no scopes selected.
  tools.push(
    createKnowledgeSearchTool({
      apiBaseUrl: params.knowledgeApiUrl,
      getRetrievalConfig: params.getRetrievalConfig
    })
  )

  return tools
}
