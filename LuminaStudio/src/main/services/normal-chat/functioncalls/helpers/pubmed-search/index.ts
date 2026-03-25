import { z } from 'zod'
import type { PaperRetrievalSearchResult } from '@preload/types'
import { pubmedSearchDescription } from './description'
import { pubmedSearchSchemaPrompt } from './schema-prompt'
import { pubmedSearchProgressivePrompt } from './progressive-prompt'
import { executePubmedSearch } from './execute'
import type {
  NormalChatFunctioncallHelper,
  NormalChatFunctioncallRegistryDependencies,
  NormalChatFunctioncallResultAssessment
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

function fingerprintPubmedArgs(args: PubmedSearchArgs): string {
  const normalizedQuery = args.query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()"]/g, ' ')
    .trim()

  return JSON.stringify({
    query: normalizedQuery,
    topK: args.topK,
    sort: args.sort,
    startDate: args.startDate ?? null,
    endDate: args.endDate ?? null
  })
}

function assessPubmedResult(
  result: PaperRetrievalSearchResult
): NormalChatFunctioncallResultAssessment {
  if (result.total_found === 0 || result.items.length === 0) {
    return {
      quality: 'none',
      shouldContinue: false,
      stopReason: '未命中可用论文，应该停止继续同方向搜索并改为总结证据空白。'
    }
  }

  const directSignalCount = result.items.filter((item) => {
    const haystack = `${item.title} ${item.abstract ?? ''}`.toLowerCase()
    return /transcriptome|rna-seq|differential|deg|gene expression/.test(haystack)
  }).length

  if (directSignalCount >= 2) {
    return {
      quality: 'useful',
      shouldContinue: false,
      stopReason: '已经拿到足够代表性的文献，应直接进入总结回答。'
    }
  }

  return {
    quality: 'weak',
    shouldContinue: true,
    stopReason: null
  }
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
    fingerprintArgs(args) {
      return fingerprintPubmedArgs(args)
    },
    execute(args, context) {
      return executePubmedSearch(args, context, {
        paperRetrievalService: dependencies.paperRetrievalService
      })
    },
    summarizeResult(result) {
      return summarizePubmedResult(result)
    },
    assessResult(result) {
      return assessPubmedResult(result)
    },
    summarizeFailure(error) {
      return error instanceof Error ? error.message : String(error)
    }
  }
}
