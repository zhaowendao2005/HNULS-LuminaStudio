import type { LangchainClientAgentCreateConfig } from '@shared/langchain-client.types'
import { createKnowledgeSearchTool } from './retrieval-tool'

export function buildAgentTools(params: {
  knowledgeApiUrl: string
  config: LangchainClientAgentCreateConfig
}): any[] {
  const tools: any[] = []

  if (params.config.retrieval) {
    tools.push(
      createKnowledgeSearchTool({
        apiBaseUrl: params.knowledgeApiUrl,
        retrieval: params.config.retrieval
      })
    )
  }

  return tools
}
