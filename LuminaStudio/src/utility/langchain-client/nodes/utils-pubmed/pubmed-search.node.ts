/**
 * ======================================================================
 * PubMed 检索节点 - 纯业务逻辑插件
 * ======================================================================
 *
 * 说明：
 * - 该节点完全与 model/graph 解耦，仅提供可复用的纯函数
 * - 不依赖任何 model 配置类型；调用方负责注入必要参数
 * - 返回 JSON 字符串，便于前端直接渲染
 */
import { logger } from '@main/services/logger'

const log = logger.scope('LangchainClient.Node.PubmedSearch')

export const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
export const PUBMED_DEFAULT_RET_MAX = 5
export const PUBMED_MAX_RET_MAX = 20

interface PubmedSearchParams {
  query: string
  apiKey?: string
  retMax?: number
  abortSignal?: AbortSignal
}

interface PubmedPaper {
  uid: string
  title: string
  source: string
  pub_date: string
  volume?: string
  issue?: string
  authors: string[]
  abstract: string
  doi: string
  fullTextAvailable: boolean
}

interface PubmedSearchOutput {
  tool_name: string
  status: 'success' | 'error'
  latency?: string
  search_params: {
    database: 'pubmed'
    query: string
    ret_max: number
    total_found: number
  }
  items: PubmedPaper[]
  error?: string
}

function clampRetMax(value?: number): number {
  const v = Math.floor(value ?? PUBMED_DEFAULT_RET_MAX)
  if (!Number.isFinite(v) || v <= 0) return PUBMED_DEFAULT_RET_MAX
  return Math.min(PUBMED_MAX_RET_MAX, Math.max(1, v))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeDecode(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripTags(text: string): string {
  return safeDecode(text.replace(/<[^>]*>/g, '')).trim()
}

function extractAll(tag: string, input: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g')
  const results: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(input))) {
    if (match[1]) results.push(match[1])
  }
  return results
}

function extractFirst(tag: string, input: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const match = regex.exec(input)
  return match?.[1] ? match[1] : ''
}

function parsePubmedXml(xml: string): PubmedPaper[] {
  const articles = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) ?? []

  return articles.map((article) => {
    const uid = stripTags(extractFirst('PMID', article))
    const title = stripTags(extractFirst('ArticleTitle', article))
    const journalTitle = stripTags(extractFirst('Title', article))
    const volume = stripTags(extractFirst('Volume', article)) || undefined
    const issue = stripTags(extractFirst('Issue', article)) || undefined

    const pubDateBlock = extractFirst('PubDate', article)
    const year = stripTags(extractFirst('Year', pubDateBlock))
    const month = stripTags(extractFirst('Month', pubDateBlock))
    const day = stripTags(extractFirst('Day', pubDateBlock))
    const pub_date = [year, month, day].filter(Boolean).join('-') || ''

    const authorBlocks = article.match(/<Author[\s\S]*?<\/Author>/g) ?? []
    const authors = authorBlocks
      .map((a) => {
        const collective = stripTags(extractFirst('CollectiveName', a))
        if (collective) return collective
        const last = stripTags(extractFirst('LastName', a))
        const fore = stripTags(extractFirst('ForeName', a))
        return [fore, last].filter(Boolean).join(' ').trim()
      })
      .filter(Boolean)

    const abstractTexts = extractAll('AbstractText', article).map(stripTags)
    const abstract = abstractTexts.join('\n').trim()

    const doiRaw = extractAll('ArticleId', article).find((id) => /IdType="doi"/i.test(id))
    const doi = doiRaw ? stripTags(doiRaw) : ''

    return {
      uid,
      title,
      source: journalTitle,
      pub_date,
      volume,
      issue,
      authors,
      abstract,
      doi,
      fullTextAvailable: false
    }
  })
}

export async function runPubmedSearch(params: PubmedSearchParams): Promise<string> {
  const startedAt = Date.now()
  const retMax = clampRetMax(params.retMax)

  const resultBase: PubmedSearchOutput = {
    tool_name: 'PubMed Retriever',
    status: 'success',
    search_params: {
      database: 'pubmed',
      query: params.query,
      ret_max: retMax,
      total_found: 0
    },
    items: []
  }

  try {
    const query = params.query.trim()
    if (!query) {
      return JSON.stringify({
        ...resultBase,
        status: 'error',
        error: '查询不能为空'
      })
    }

    const esearchUrl = new URL(`${PUBMED_BASE_URL}/esearch.fcgi`)
    esearchUrl.searchParams.set('db', 'pubmed')
    esearchUrl.searchParams.set('term', query)
    esearchUrl.searchParams.set('retmax', String(retMax))
    esearchUrl.searchParams.set('retmode', 'json')
    if (params.apiKey) esearchUrl.searchParams.set('api_key', params.apiKey)

    log.info('PubMed ESearch request', { query, retMax })

    const esearchResp = await globalThis.fetch(esearchUrl.toString(), {
      method: 'GET',
      signal: params.abortSignal
    })

    if (!esearchResp.ok) {
      throw new Error(`ESearch failed: HTTP_${esearchResp.status}`)
    }

    const esearchJson = (await esearchResp.json()) as any
    const idList: string[] = esearchJson?.esearchresult?.idlist ?? []
    const total = Number(esearchJson?.esearchresult?.count ?? 0)

    resultBase.search_params.total_found = Number.isFinite(total) ? total : 0

    if (idList.length === 0) {
      resultBase.latency = `${Date.now() - startedAt}ms`
      return JSON.stringify(resultBase)
    }

    // NCBI rate limit：无 key ~3 req/s，有 key ~10 req/s
    const delayMs = params.apiKey ? 110 : 350
    await sleep(delayMs)

    const efetchUrl = new URL(`${PUBMED_BASE_URL}/efetch.fcgi`)
    efetchUrl.searchParams.set('db', 'pubmed')
    efetchUrl.searchParams.set('id', idList.join(','))
    efetchUrl.searchParams.set('rettype', 'abstract')
    efetchUrl.searchParams.set('retmode', 'xml')
    if (params.apiKey) efetchUrl.searchParams.set('api_key', params.apiKey)

    log.info('PubMed EFetch request', { count: idList.length })

    const efetchResp = await globalThis.fetch(efetchUrl.toString(), {
      method: 'GET',
      signal: params.abortSignal
    })

    if (!efetchResp.ok) {
      throw new Error(`EFetch failed: HTTP_${efetchResp.status}`)
    }

    const xml = await efetchResp.text()
    const items = parsePubmedXml(xml)

    resultBase.items = items
    resultBase.latency = `${Date.now() - startedAt}ms`

    return JSON.stringify(resultBase)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.warn('PubMed search failed', { message: msg })

    const errorResult: PubmedSearchOutput = {
      ...resultBase,
      status: 'error',
      latency: `${Date.now() - startedAt}ms`,
      error: msg
    }

    return JSON.stringify(errorResult)
  }
}
