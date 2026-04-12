import { z } from 'zod'
import { kgRetrievalActionDescriptor } from '../functioncall/kg-retrieval/descriptor'
import { kgRetrievalActionPrompt } from '../functioncall/kg-retrieval/prompt'
import { kgRetrievalActionSchema } from '../functioncall/kg-retrieval/schema'
import { knowledgeRetrievalActionDescriptor } from '../functioncall/knowledge-retrieval/descriptor'
import { knowledgeRetrievalActionPrompt } from '../functioncall/knowledge-retrieval/prompt'
import { knowledgeRetrievalActionSchema } from '../functioncall/knowledge-retrieval/schema'
import { pubmedSearchActionDescriptor } from '../functioncall/pubmed-search/descriptor'
import { pubmedSearchActionPrompt } from '../functioncall/pubmed-search/prompt'
import { pubmedSearchActionSchema } from '../functioncall/pubmed-search/schema'
import { dispatchSubAgentActionDescriptor } from '../system/dispatch-sub-agent/descriptor'
import { dispatchSubAgentActionPrompt } from '../system/dispatch-sub-agent/prompt'
import { dispatchSubAgentActionSchema } from '../system/dispatch-sub-agent/schema'
import { getActionSpecActionDescriptor } from '../system/get-action-spec/descriptor'
import { getActionSpecActionPrompt } from '../system/get-action-spec/prompt'
import { getActionSpecActionSchema } from '../system/get-action-spec/schema'
import type { NormalChatActionDefinition } from './action.types'
import { createActionSchemaDebugSnapshot } from './schema-debug'

const getActionSpecInputSchema = z.object({ action_key: z.string().min(1) }).strict()

const dispatchSubAgentInputSchema = z
  .object({
    goal: z.string().min(1),
    enabled_action_keys: z.array(z.string()).default([]),
    pubmed_mode: z.enum(['fast', 'slow']).default('fast'),
    max_react_steps: z.number().int().min(1).max(8).default(2)
  })
  .strict()

const pubmedSearchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(300),
    top_k: z.number().int().min(1).max(20).optional().default(5),
    sort: z.enum(['relevance', 'pub_date']).optional().default('relevance'),
    date_from: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? null : value),
      z.string().date().nullable().optional().default(null)
    ),
    date_to: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? null : value),
      z.string().date().nullable().optional().default(null)
    ),
    api_key_ref_id: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? null : value),
      z.string().nullable().optional().default(null)
    )
  })
  .strict()

const knowledgeRetrievalInputSchema = z
  .object({
    knowledgeBaseId: z.number().int().positive(),
    tableName: z.string().trim().min(1),
    queryText: z.string().trim().min(1),
    fileKey: z.string().trim().min(1).optional(),
    fileKeys: z.array(z.string().trim().min(1)).min(1).optional(),
    k: z.number().int().positive().optional(),
    ef: z.number().int().positive().optional(),
    rerankModelId: z.string().trim().min(1).optional(),
    rerankTopN: z.number().int().positive().optional()
  })
  .strict()

const kgRetrievalInputSchema = z
  .object({
    graphTableBase: z.string().trim().min(1),
    query: z.string().trim().optional(),
    mode: z.enum(['local', 'global', 'hybrid', 'naive']).optional(),
    highLevelKeywords: z.array(z.string().trim().min(1)).optional(),
    lowLevelKeywords: z.array(z.string().trim().min(1)).optional(),
    rerank: z
      .object({
        enabled: z.boolean(),
        modelId: z.string().trim().min(1).optional(),
        topN: z.number().int().positive().optional()
      })
      .strict()
      .optional()
  })
  .strict()

const getActionSpecActionDefinition: NormalChatActionDefinition = {
  descriptor: getActionSpecActionDescriptor,
  schema: getActionSpecActionSchema,
  prompt: getActionSpecActionPrompt,
  inputSchema: getActionSpecInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: getActionSpecActionDescriptor.key,
    runtimeSchema: getActionSpecInputSchema,
    publicSchema: getActionSpecActionSchema
  }),
  alwaysLoaded: true,
  isReadOnly: () => true,
  isConcurrencySafe: () => true
}

const dispatchSubAgentActionDefinition: NormalChatActionDefinition = {
  descriptor: dispatchSubAgentActionDescriptor,
  schema: dispatchSubAgentActionSchema,
  prompt: dispatchSubAgentActionPrompt,
  inputSchema: dispatchSubAgentInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: dispatchSubAgentActionDescriptor.key,
    runtimeSchema: dispatchSubAgentInputSchema,
    publicSchema: dispatchSubAgentActionSchema
  }),
  alwaysLoaded: true,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async validateInput(input) {
    const goal = String(input.goal ?? '').trim()
    if (!goal) {
      return {
        ok: false,
        kind: 'business',
        message: 'Subagent goal 不能为空。',
        retryable: true
      }
    }
    return { ok: true }
  }
}

const pubmedSearchActionDefinition: NormalChatActionDefinition = {
  descriptor: pubmedSearchActionDescriptor,
  schema: pubmedSearchActionSchema,
  prompt: pubmedSearchActionPrompt,
  inputSchema: pubmedSearchInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: pubmedSearchActionDescriptor.key,
    runtimeSchema: pubmedSearchInputSchema,
    publicSchema: pubmedSearchActionSchema
  }),
  isReadOnly: () => true,
  isConcurrencySafe: () => true
}

const knowledgeRetrievalActionDefinition: NormalChatActionDefinition = {
  descriptor: knowledgeRetrievalActionDescriptor,
  schema: knowledgeRetrievalActionSchema,
  prompt: knowledgeRetrievalActionPrompt,
  inputSchema: knowledgeRetrievalInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: knowledgeRetrievalActionDescriptor.key,
    runtimeSchema: knowledgeRetrievalInputSchema,
    publicSchema: knowledgeRetrievalActionSchema
  }),
  isReadOnly: () => true,
  isConcurrencySafe: () => true
}

const kgRetrievalActionDefinition: NormalChatActionDefinition = {
  descriptor: kgRetrievalActionDescriptor,
  schema: kgRetrievalActionSchema,
  prompt: kgRetrievalActionPrompt,
  inputSchema: kgRetrievalInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: kgRetrievalActionDescriptor.key,
    runtimeSchema: kgRetrievalInputSchema,
    publicSchema: kgRetrievalActionSchema
  }),
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async validateInput(input) {
    const hasQuery = typeof input.query === 'string' && input.query.trim().length > 0
    const hasHighLevel = Array.isArray(input.highLevelKeywords) && input.highLevelKeywords.length > 0
    const hasLowLevel = Array.isArray(input.lowLevelKeywords) && input.lowLevelKeywords.length > 0
    if (!hasQuery && !hasHighLevel && !hasLowLevel) {
      return {
        ok: false,
        kind: 'business',
        message: 'query、highLevelKeywords、lowLevelKeywords 至少需要提供一种。',
        retryable: true
      }
    }
    if (input.rerank && input.rerank.enabled && !input.rerank.modelId) {
      return {
        ok: false,
        kind: 'business',
        message: 'rerank.enabled=true 时必须提供 rerank.modelId。',
        retryable: true
      }
    }
    return { ok: true }
  }
}

const ACTION_DEFINITIONS = new Map<string, NormalChatActionDefinition>([
  [getActionSpecActionDefinition.descriptor.key, getActionSpecActionDefinition],
  [dispatchSubAgentActionDefinition.descriptor.key, dispatchSubAgentActionDefinition],
  [pubmedSearchActionDefinition.descriptor.key, pubmedSearchActionDefinition],
  [knowledgeRetrievalActionDefinition.descriptor.key, knowledgeRetrievalActionDefinition],
  [kgRetrievalActionDefinition.descriptor.key, kgRetrievalActionDefinition]
])

export function listNormalChatActionDefinitions(): NormalChatActionDefinition[] {
  return Array.from(ACTION_DEFINITIONS.values())
}

export function getNormalChatActionDefinition(
  actionKey: string
): NormalChatActionDefinition | null {
  return ACTION_DEFINITIONS.get(actionKey) ?? null
}
