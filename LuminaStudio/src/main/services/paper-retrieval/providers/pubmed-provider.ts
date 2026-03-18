import { logger } from '../../logger'
import type {
  PaperRetrievalPaperItem,
  PaperRetrievalProviderDescriptor,
  PaperRetrievalSearchRequest,
  PaperRetrievalSearchResult,
  PaperRetrievalSortOption
} from '../../../../preload/types/paper-retrieval.types'
import type {
  PaperRetrievalProvider,
  PaperRetrievalProviderContext,
  PaperRetrievalProviderNormalizedParams
} from './types'
import { PaperRetrievalValidationError } from './types'

const log = logger.scope('PaperRetrievalProvider.PubMed')

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const PUBMED_DEFAULT_LIMIT = 5
const PUBMED_MAX_LIMIT = 20

const PUBMED_DESCRIPTOR: PaperRetrievalProviderDescriptor = {
  id: 'pubmed',
  label: 'PubMed',
  description: '检索 NCBI PubMed 医学与生命科学论文。',
  requires_api_key: false,
  supported_sorts: ['relevance', 'pub_date'],
  supports_date_range: true,
  fields: [
    {
      key: 'query',
      label: '检索词',
      description: 'PubMed 检索表达式，支持关键词、布尔运算与字段限定。',
      type: 'string',
      required: true
    },
    {
      key: 'limit',
      label: '返回条数',
      description: '本次最多返回多少条结果，范围 1-20。',
      type: 'number',
      required: false,
      default_value: PUBMED_DEFAULT_LIMIT
    },
    {
      key: 'sort',
      label: '排序方式',
      description: '可选 relevance 或 pub_date。',
      type: 'string',
      required: false,
      default_value: 'relevance'
    },
    {
      key: 'start_date',
      label: '起始日期',
      description: '可选，格式 YYYY/MM/DD 或 YYYY-MM-DD。',
      type: 'date',
      required: false,
      default_value: null
    },
    {
      key: 'end_date',
      label: '结束日期',
      description: '可选，格式 YYYY/MM/DD 或 YYYY-MM-DD。',
      type: 'date',
      required: false,
      default_value: null
    }
  ]
}

interface PubmedESearchResponse {
  esearchresult?: {
    count?: string
    idlist?: string[]
  }
}

/**
 * PubMed provider。
 *
 * 这里独立实现 ESearch + EFetch，不依赖 utility/langchain-client。
 */
export class PubmedProvider implements PaperRetrievalProvider {
  readonly descriptor = PUBMED_DESCRIPTOR

  normalizeRequest(request: PaperRetrievalSearchRequest): PaperRetrievalProviderNormalizedParams {
    const rawOptions = this.normalizeProviderOptions(request.provider_options)
    const query = this.readRequiredString(rawOptions.query, 'provider_options.query')
    const sort = this.normalizeSort(rawOptions.sort)
    const startDate = this.normalizeDate(rawOptions.start_date)
    const endDate = this.normalizeDate(rawOptions.end_date)
    const limit = this.normalizeLimit(rawOptions.limit)

    return {
      query,
      sort,
      startDate,
      endDate,
      limit,
      rawOptions
    }
  }

  async search(
    normalizedParams: PaperRetrievalProviderNormalizedParams,
    context: PaperRetrievalProviderContext
  ): Promise<PaperRetrievalSearchResult> {
    const startedAt = Date.now()
    const query = normalizedParams.query.trim()
    const esearchUrl = new URL(`${PUBMED_BASE_URL}/esearch.fcgi`)

    esearchUrl.searchParams.set('db', 'pubmed')
    esearchUrl.searchParams.set('term', query)
    esearchUrl.searchParams.set('retmax', String(normalizedParams.limit))
    esearchUrl.searchParams.set('retmode', 'json')
    esearchUrl.searchParams.set('sort', normalizedParams.sort)

    if (normalizedParams.startDate || normalizedParams.endDate) {
      esearchUrl.searchParams.set('datetype', 'pdat')
      if (normalizedParams.startDate) {
        esearchUrl.searchParams.set('mindate', normalizedParams.startDate)
      }
      if (normalizedParams.endDate) {
        esearchUrl.searchParams.set('maxdate', normalizedParams.endDate)
      }
    }

    if (context.apiKey.value) {
      esearchUrl.searchParams.set('api_key', context.apiKey.value)
    }

    log.info('Executing PubMed search', {
      query,
      sort: normalizedParams.sort,
      limit: normalizedParams.limit,
      hasApiKey: Boolean(context.apiKey.value)
    })

    const esearchResponse = await globalThis.fetch(esearchUrl.toString(), {
      method: 'GET',
      signal: context.abortSignal
    })

    if (!esearchResponse.ok) {
      throw new Error(`PubMed ESearch 请求失败：HTTP ${esearchResponse.status}`)
    }

    const esearchJson = (await esearchResponse.json()) as PubmedESearchResponse
    const idList = Array.isArray(esearchJson.esearchresult?.idlist)
      ? esearchJson.esearchresult?.idlist.filter((item): item is string => Boolean(item))
      : []
    const totalFound = Number(esearchJson.esearchresult?.count ?? 0)

    if (idList.length === 0) {
      return {
        provider_id: this.descriptor.id,
        query,
        sort: normalizedParams.sort,
        total_found: Number.isFinite(totalFound) ? totalFound : 0,
        items: [],
        meta: {
          provider_id: this.descriptor.id,
          resolved_api_key_ref_id: context.apiKey.refId,
          api_key_resolved: Boolean(context.apiKey.value),
          rate_limit_tier: context.apiKey.value ? 'elevated' : 'default',
          latency_ms: Date.now() - startedAt
        }
      }
    }

    // PubMed 无 key 大致 3 req/s，有 key 大致 10 req/s。
    await this.sleep(context.apiKey.value ? 110 : 350)

    const efetchUrl = new URL(`${PUBMED_BASE_URL}/efetch.fcgi`)
    efetchUrl.searchParams.set('db', 'pubmed')
    efetchUrl.searchParams.set('id', idList.join(','))
    efetchUrl.searchParams.set('rettype', 'abstract')
    efetchUrl.searchParams.set('retmode', 'xml')

    if (context.apiKey.value) {
      efetchUrl.searchParams.set('api_key', context.apiKey.value)
    }

    const efetchResponse = await globalThis.fetch(efetchUrl.toString(), {
      method: 'GET',
      signal: context.abortSignal
    })

    if (!efetchResponse.ok) {
      throw new Error(`PubMed EFetch 请求失败：HTTP ${efetchResponse.status}`)
    }

    const xml = await efetchResponse.text()
    const items = this.parsePubmedXml(xml)

    return {
      provider_id: this.descriptor.id,
      query,
      sort: normalizedParams.sort,
      total_found: Number.isFinite(totalFound) ? totalFound : 0,
      items,
      meta: {
        provider_id: this.descriptor.id,
        resolved_api_key_ref_id: context.apiKey.refId,
        api_key_resolved: Boolean(context.apiKey.value),
        rate_limit_tier: context.apiKey.value ? 'elevated' : 'default',
        latency_ms: Date.now() - startedAt
      }
    }
  }

  private normalizeProviderOptions(
    providerOptions: Record<string, unknown>
  ): Record<string, unknown> {
    return providerOptions && typeof providerOptions === 'object' ? providerOptions : {}
  }

  private readRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new PaperRetrievalValidationError(`${fieldName} 不能为空`)
    }
    return value.trim()
  }

  private normalizeSort(value: unknown): PaperRetrievalSortOption {
    if (value === undefined || value === null || value === '') {
      return 'relevance'
    }
    if (value === 'relevance' || value === 'pub_date') {
      return value
    }
    throw new PaperRetrievalValidationError('provider_options.sort 仅支持 relevance 或 pub_date')
  }

  private normalizeLimit(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return PUBMED_DEFAULT_LIMIT
    }

    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(parsed)) {
      throw new PaperRetrievalValidationError('provider_options.limit 必须是数字')
    }

    const normalized = Math.floor(parsed)
    if (normalized < 1 || normalized > PUBMED_MAX_LIMIT) {
      throw new PaperRetrievalValidationError('provider_options.limit 必须在 1 到 20 之间')
    }

    return normalized
  }

  private normalizeDate(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null
    }

    if (typeof value !== 'string') {
      throw new PaperRetrievalValidationError('日期字段必须是字符串')
    }

    const normalized = value.trim().replace(/-/g, '/')
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) {
      throw new PaperRetrievalValidationError('日期格式必须为 YYYY/MM/DD 或 YYYY-MM-DD')
    }

    return normalized
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private safeDecode(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  private stripTags(text: string): string {
    return this.safeDecode(text.replace(/<[^>]*>/g, '')).trim()
  }

  private extractAll(tag: string, input: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g')
    const results: string[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(input))) {
      if (match[1]) {
        results.push(match[1])
      }
    }

    return results
  }

  private extractFirst(tag: string, input: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
    const match = regex.exec(input)
    return match?.[1] ?? ''
  }

  private extractArticleIds(article: string): Array<{ idType: string; value: string }> {
    const regex = /<ArticleId\s+IdType="([^"]+)"[^>]*>([\s\S]*?)<\/ArticleId>/g
    const results: Array<{ idType: string; value: string }> = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(article))) {
      results.push({
        idType: match[1],
        value: this.stripTags(match[2] ?? '')
      })
    }

    return results
  }

  private parsePubmedXml(xml: string): PaperRetrievalPaperItem[] {
    const articles = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) ?? []

    return articles.map((article) => {
      const uid = this.stripTags(this.extractFirst('PMID', article))
      const title = this.stripTags(this.extractFirst('ArticleTitle', article))
      const source = this.stripTags(this.extractFirst('Title', article))
      const volume = this.stripTags(this.extractFirst('Volume', article)) || undefined
      const issue = this.stripTags(this.extractFirst('Issue', article)) || undefined

      const pubDateBlock = this.extractFirst('PubDate', article)
      const year = this.stripTags(this.extractFirst('Year', pubDateBlock))
      const month = this.stripTags(this.extractFirst('Month', pubDateBlock))
      const day = this.stripTags(this.extractFirst('Day', pubDateBlock))
      const pub_date = [year, month, day].filter(Boolean).join('-')

      const authorBlocks = article.match(/<Author[\s\S]*?<\/Author>/g) ?? []
      const authors = authorBlocks
        .map((authorBlock) => {
          const collectiveName = this.stripTags(this.extractFirst('CollectiveName', authorBlock))
          if (collectiveName) {
            return collectiveName
          }

          const lastName = this.stripTags(this.extractFirst('LastName', authorBlock))
          const foreName = this.stripTags(this.extractFirst('ForeName', authorBlock))
          return [foreName, lastName].filter(Boolean).join(' ').trim()
        })
        .filter(Boolean)

      const abstract = this.extractAll('AbstractText', article)
        .map((item) => this.stripTags(item))
        .join('\n')
        .trim()

      const articleIds = this.extractArticleIds(article)
      const doi = articleIds.find((item) => item.idType.toLowerCase() === 'doi')?.value ?? ''
      const pmcId = articleIds.find((item) => item.idType.toLowerCase() === 'pmc')?.value ?? ''

      return {
        uid,
        title,
        source,
        pub_date,
        volume,
        issue,
        authors,
        abstract,
        doi,
        full_text_available: Boolean(pmcId),
        url: uid ? `https://pubmed.ncbi.nlm.nih.gov/${uid}/` : undefined
      }
    })
  }
}
