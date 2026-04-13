import type { NormalChatKnowledgeRetrievalPolicyInput } from '@preload/types'

function renderTableLine(table: {
  tableName: string
  embeddingConfigName?: string
  embeddingConfigId: string
  dimensions: number
}): string {
  return `- ${table.tableName} | embeddingConfigName=${table.embeddingConfigName || '--'} | embeddingConfigId=${table.embeddingConfigId} | dimensions=${table.dimensions}`
}

export function hasUsableKnowledgeRetrievalPolicy(
  policy: NormalChatKnowledgeRetrievalPolicyInput | null | undefined
): boolean {
  if (!policy || policy.mode === 'disabled') {
    return false
  }

  if (!policy.knowledgeBaseId || !policy.knowledgeBaseName) {
    return false
  }

  if (policy.mode === 'global') {
    return policy.tables.length > 0
  }

  return policy.documents.some((document) => document.tables.length > 0)
}

export function buildKnowledgeRetrievalPolicyPrompt(
  policy: NormalChatKnowledgeRetrievalPolicyInput | null | undefined
): string | null {
  if (!hasUsableKnowledgeRetrievalPolicy(policy) || !policy) {
    return null
  }

  const header = [
    '## KnowledgeRetrievalPolicy',
    '',
    'actionKey: functioncall.knowledge_retrieval',
    'enabled: true',
    `mode: ${policy.mode}`,
    '',
    'The following scope is the only valid scope for `knowledge_retrieval` in this turn.',
    `- knowledgeBaseId: ${policy.knowledgeBaseId}`,
    `- knowledgeBaseName: ${policy.knowledgeBaseName}`,
    '- knowledgeBaseId, tableName, queryText must always be valid.',
    '- queryText must be a concise retrieval query, not a plan or explanation.',
    '- Never invent tableName, fileKey, or embedding config information.'
  ]

  if (policy.rerank?.enabled && policy.rerank.modelId) {
    header.push(
      `- If rerank is useful, prefer rerankModelId=${policy.rerank.modelId}.`,
      `- If rerankTopN is needed, prefer rerankTopN=${policy.rerank.topN ?? 5}.`
    )
  }

  if (policy.mode === 'global') {
    return [
      ...header,
      '- In global mode, do not pass fileKey or fileKeys unless the user explicitly asks to narrow by file.',
      '- The service cannot search multiple tables in one call. If multiple tables are needed, call the function multiple times, one table per call.',
      '',
      'Allowed tables:',
      ...policy.tables.map(renderTableLine),
      '',
      'Preferred call shape:',
      '```json',
      JSON.stringify(
        {
          knowledgeBaseId: policy.knowledgeBaseId,
          tableName: '<one allowed tableName>',
          queryText: '<retrieval query>'
        },
        null,
        2
      ),
      '```'
    ].join('\n')
  }

  const documentLines = policy.documents.flatMap((document) => [
    `- fileKey: ${document.fileKey}`,
    `  fileName: ${document.fileName}`,
    '  allowedTables:',
    ...document.tables.map((table) => `  ${renderTableLine(table).slice(2)}`)
  ])

  return [
    ...header,
    '- In documents mode, every call must stay inside the allowed files below.',
    '- Prefer fileKey for a single file. Use fileKeys only when all listed files share the same tableName.',
    '',
    'Allowed document scopes:',
    ...documentLines,
    '',
    'Valid single-file call shape:',
    '```json',
    JSON.stringify(
      {
        knowledgeBaseId: policy.knowledgeBaseId,
        tableName: '<allowed tableName for this file>',
        queryText: '<retrieval query>',
        fileKey: '<one allowed fileKey>'
      },
      null,
      2
    ),
    '```'
  ].join('\n')
}
