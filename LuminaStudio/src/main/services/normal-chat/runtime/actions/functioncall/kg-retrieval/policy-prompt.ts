import type { NormalChatKgRetrievalPolicyInput } from '@preload/types'

function renderGraphTableLine(table: {
  graphTableBase: string
  displayName?: string
  entityCount: number
  relationCount: number
}): string {
  return `- ${table.graphTableBase} | displayName=${table.displayName || '--'} | entities=${table.entityCount} | relations=${table.relationCount}`
}

export function hasUsableKgRetrievalPolicy(
  policy: NormalChatKgRetrievalPolicyInput | null | undefined
): boolean {
  if (!policy || policy.mode === 'disabled') {
    return false
  }

  if (!policy.knowledgeBaseId || !policy.knowledgeBaseName) {
    return false
  }

  return policy.graphTables.length > 0
}

export function buildKgRetrievalPolicyPrompt(
  policy: NormalChatKgRetrievalPolicyInput | null | undefined
): string | null {
  if (!hasUsableKgRetrievalPolicy(policy) || !policy) {
    return null
  }

  const header = [
    '## KGRetrievalPolicy',
    '',
    'actionKey: functioncall.kg_retrieval',
    'enabled: true',
    `mode: ${policy.mode}`,
    '',
    'The following scope is the only valid scope for `kg_retrieval` in this turn.',
    `- knowledgeBaseId: ${policy.knowledgeBaseId}`,
    `- knowledgeBaseName: ${policy.knowledgeBaseName}`,
    '- graphTableBase must always be one of the allowed graph tables below.',
    '- Never invent graphTableBase, displayName, or graph schema information.',
    '- If mode is uncertain, omit mode and let the service choose its default.',
    '- query is optional, but query, highLevelKeywords, lowLevelKeywords must contain at least one useful signal.'
  ]

  if (policy.rerank?.enabled && policy.rerank.modelId) {
    header.push(
      `- If rerank is useful, prefer rerank.modelId=${policy.rerank.modelId}.`,
      `- If rerank.topN is needed, prefer rerank.topN=${policy.rerank.topN ?? 5}.`
    )
  }

  if (policy.mode === 'global') {
    return [
      ...header,
      '- In global mode, choose exactly one graphTableBase from the allowed list.',
      '- If multiple graph tables are needed, call the function multiple times, one graphTableBase per call.',
      '',
      'Allowed graph tables:',
      ...policy.graphTables.map(renderGraphTableLine),
      '',
      'Preferred call shape:',
      '```json',
      JSON.stringify(
        {
          graphTableBase: '<one allowed graphTableBase>',
          query: '<optional retrieval query>'
        },
        null,
        2
      ),
      '```'
    ].join('\n')
  }

  return [
    ...header,
    '- In tables mode, every call must stay inside the selected graph tables below.',
    '',
    'Selected graph tables:',
    ...policy.graphTables.map(renderGraphTableLine),
    '',
    'Valid call shape:',
    '```json',
    JSON.stringify(
      {
        graphTableBase: '<one selected graphTableBase>',
        query: '<optional retrieval query>'
      },
      null,
      2
    ),
    '```'
  ].join('\n')
}
