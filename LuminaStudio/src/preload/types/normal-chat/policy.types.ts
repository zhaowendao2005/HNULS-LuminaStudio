export type NormalChatKnowledgeRetrievalPolicyMode = 'global' | 'documents' | 'disabled'

export interface NormalChatKnowledgeRetrievalPolicyTable {
  tableName: string
  embeddingConfigId: string
  embeddingConfigName?: string
  dimensions: number
}

export interface NormalChatKnowledgeRetrievalPolicyDocument {
  fileKey: string
  fileName: string
  tables: NormalChatKnowledgeRetrievalPolicyTable[]
}

export interface NormalChatKnowledgeRetrievalPolicyRerank {
  enabled: boolean
  modelId: string | null
  topN: number | null
}

export interface NormalChatKnowledgeRetrievalPolicyInput {
  mode: NormalChatKnowledgeRetrievalPolicyMode
  knowledgeBaseId: number | null
  knowledgeBaseName: string | null
  tables: NormalChatKnowledgeRetrievalPolicyTable[]
  documents: NormalChatKnowledgeRetrievalPolicyDocument[]
  rerank?: NormalChatKnowledgeRetrievalPolicyRerank
}

export type NormalChatKgRetrievalPolicyMode = 'global' | 'tables' | 'disabled'

export interface NormalChatKgRetrievalPolicyTable {
  graphTableBase: string
  displayName?: string
  entityCount: number
  relationCount: number
}

export interface NormalChatKgRetrievalPolicyRerank {
  enabled: boolean
  modelId: string | null
  topN: number | null
}

export interface NormalChatKgRetrievalPolicyInput {
  mode: NormalChatKgRetrievalPolicyMode
  knowledgeBaseId: number | null
  knowledgeBaseName: string | null
  graphTables: NormalChatKgRetrievalPolicyTable[]
  rerank?: NormalChatKgRetrievalPolicyRerank
}
