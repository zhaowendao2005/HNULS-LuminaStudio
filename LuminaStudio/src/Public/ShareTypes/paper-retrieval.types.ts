import type { OFJsonSchemaProperty, OFStructuredJsonSchema } from './Orchestraflow-types/core-types'

/**
 * paper-retrieval 节点共享契约。
 * 这里只描述共享输入输出，不夹带实现依赖。
 */

export const PAPER_RETRIEVAL_NODE_TYPE = 'paper-retrieval' as const
export const PAPER_RETRIEVAL_AUTHORING_TOKEN = 'paper-retrieval' as const

export type PaperRetrievalProviderKind = 'pubmed' | 'crossref' | 'semantic-scholar' | 'custom'

/**
 * 论文检索提供方描述。
 */
export interface PaperRetrievalProviderDescriptor {
  id: string
  label: string
  kind: PaperRetrievalProviderKind
  supportsKeywordSearch: boolean
  supportsAuthorFilter: boolean
  supportsYearFilter: boolean
  supportsIdentifierLookup: boolean
  notes?: string[]
}

/**
 * editor 可直接消费的权限树。
 * 论文检索通常不是知识库分层，因此这里更多表达 provider → capability。
 */
export interface PaperRetrievalPermissionTreeNode {
  id: string
  label: string
  kind: 'provider' | 'capability'
  checked?: boolean
  disabled?: boolean
  description?: string
  children?: PaperRetrievalPermissionTreeNode[]
}

export interface PaperRetrievalPermissionTree {
  providers: PaperRetrievalPermissionTreeNode[]
}

export type PaperRetrievalNodeSortBy = 'relevance' | 'date_desc' | 'date_asc'

export type PaperRetrievalPromptRole = 'system' | 'user' | 'assistant'

export interface PaperRetrievalPromptItem {
  id: string
  role: PaperRetrievalPromptRole
  text: string
}

/**
 * 节点配置 DTO。
 */
export interface PaperRetrievalNodeConfigDTO {
  query_template: PaperRetrievalPromptItem[]
  provider_id: string
  api_key_ref_id: string | null
  top_k: number
  sort_by: PaperRetrievalNodeSortBy
  date_from: string | null
  date_to: string | null
  provider_options: Record<string, string | number | boolean | null>
}

/**
 * 单条论文结果。
 */
export interface PaperRetrievalItem {
  paper_id?: string
  provider_record_id?: string
  title: string
  abstract?: string
  authors?: string[]
  journal?: string
  published_year?: number
  doi?: string
  pmid?: string
  url?: string
  score?: number | null
  metadata?: Record<string, unknown>
}

/**
 * 标准化结果结构。
 */
export interface PaperRetrievalNormalizedResult {
  query: string
  provider: string
  total_found: number
  returned_count: number
  items: PaperRetrievalItem[]
  latency_ms: number
}

/**
 * 节点显式暴露变量集合。
 */
export interface PaperRetrievalOutputPayload extends PaperRetrievalNormalizedResult {
  result: PaperRetrievalNormalizedResult
}

/**
 * 供 shared definition 复用的 schema。
 */
export const paperRetrievalResultSchema: OFStructuredJsonSchema = {
  type: 'object',
  required: ['query', 'provider', 'total_found', 'returned_count', 'items', 'latency_ms'],
  additionalProperties: false,
  properties: {
    query: {
      type: 'string',
      description: '本次论文检索查询词。'
    },
    provider: {
      type: 'string',
      description: '执行检索的 provider 标识。'
    },
    total_found: {
      type: 'number',
      description: 'provider 侧估算或返回的总命中数量。'
    },
    returned_count: {
      type: 'number',
      description: '当前返回给工作流的结果数。'
    },
    items: {
      type: 'array',
      description: '标准化论文结果列表。',
      items: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          paper_id: { type: 'string', description: '统一论文 id。' },
          provider_record_id: { type: 'string', description: 'provider 侧原始记录 id。' },
          title: { type: 'string', description: '论文标题。' },
          abstract: { type: 'string', description: '摘要。' },
          authors: {
            type: 'array',
            description: '作者列表。',
            items: { type: 'string', description: '作者名。' }
          },
          journal: { type: 'string', description: '期刊或会议名。' },
          published_year: { type: 'number', description: '发表年份。' },
          doi: { type: 'string', description: 'DOI。' },
          pmid: { type: 'string', description: 'PubMed PMID。' },
          url: { type: 'string', description: '跳转链接。' },
          score: { type: 'number', description: '可选排序得分。' },
          metadata: {
            type: 'object',
            description: '附加元数据。',
            required: [],
            additionalProperties: false,
            properties: {}
          }
        }
      }
    },
    latency_ms: {
      type: 'number',
      description: '一次检索的总耗时，单位毫秒。'
    }
  }
}

export const paperRetrievalItemSchema: OFJsonSchemaProperty =
  paperRetrievalResultSchema.properties.items
