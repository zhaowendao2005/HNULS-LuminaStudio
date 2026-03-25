import { z } from 'zod'
import type { PaperRetrievalSearchResult } from '@preload/types'
import { pubmedSearchDescription } from './description'
import { pubmedSearchSchemaPrompt } from './schema-prompt'
import { pubmedSearchProgressivePrompt } from './progressive-prompt'
import { executePubmedSearch } from './execute'
import type {
  NormalChatFunctioncallHelper,
  NormalChatFunctioncallRegistryDependencies
} from '../../contracts'

export const pubmedSearchArgsSchema = z.object({
  query: z.string().trim().min(1, 'query 不能为空'),
  topK: z.number().int().min(1).max(10).default(5),
  sort: z.enum(['relevance', 'pub_date']).default('relevance'),
  startDate: z.string().trim().min(1).nullable().optional(),
  endDate: z.string().trim().min(1).nullable().optional()
})

export type PubmedSearchArgs = z.infer<typeof pubmedSearchArgsSchema>

function summarizePubmedResult(result: PaperRetrievalSearchResult): string {
  if (!result.items.length) {
    return `PubMed 未命中结果，query=${result.query}`
  }

  return result.items
    .slice(0, 3)
    .map((item, index) => {
      const authors = item.authors.length > 0 ? item.authors.join('，') : '未知作者'
      return `${index + 1}. ${item.title || '未命名文献'} | ${item.source || '未知来源'} | ${
        item.pub_date || '未知日期'
      } | ${authors}`
    })
    .join('； ')
}

export function createPubmedSearchHelper(
  dependencies: NormalChatFunctioncallRegistryDependencies
): NormalChatFunctioncallHelper<PubmedSearchArgs, PaperRetrievalSearchResult> {
  return {
    id: 'pubmed-search',
    displayName: 'PubMed 论文检索',
    description: pubmedSearchDescription,
    schemaPrompt: pubmedSearchSchemaPrompt,
    progressivePrompt: pubmedSearchProgressivePrompt,
    argsSchema: pubmedSearchArgsSchema,
    execute(args, context) {
      return executePubmedSearch(args, context, {
        paperRetrievalService: dependencies.paperRetrievalService
      })
    },
    summarizeResult(result) {
      return summarizePubmedResult(result)
    },
    summarizeFailure(error) {
      return error instanceof Error ? error.message : String(error)
    }
  }
}
