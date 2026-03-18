import type { ApiResponse } from './base.types'

/**
 * 论文检索 provider 的排序方式。
 *
 * 这里保持字符串联合类型，便于 descriptor 直接声明自己支持哪些排序。
 */
export type PaperRetrievalSortOption = 'relevance' | 'pub_date'

/**
 * 论文检索字段描述。
 *
 * 用于告诉前端当前 provider 需要哪些 provider_options 字段。
 */
export interface PaperRetrievalProviderFieldDescriptor {
  key: string
  label: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
  default_value?: string | number | boolean | null
}

/**
 * provider 的公开描述信息。
 *
 * 注意：该结构是跨进程公共契约，字段名按需求固定。
 */
export interface PaperRetrievalProviderDescriptor {
  id: string
  label: string
  description: string
  requires_api_key: boolean
  supported_sorts: PaperRetrievalSortOption[]
  supports_date_range: boolean
  fields: PaperRetrievalProviderFieldDescriptor[]
}

/**
 * 运行时节点持久化配置。
 *
 * 需求要求这里只保存 provider_id / api_key_ref_id / provider_options。
 */
export interface PaperRetrievalRuntimeConfig {
  provider_id: string
  api_key_ref_id: string | null
  provider_options: Record<string, unknown>
}

/**
 * 检索请求。
 *
 * 这里直接复用运行时节点配置，保证主进程服务与节点持久化结构一致。
 */
export interface PaperRetrievalSearchRequest extends PaperRetrievalRuntimeConfig {}

/**
 * 单条论文结果。
 */
export interface PaperRetrievalPaperItem {
  uid: string
  title: string
  source: string
  pub_date: string
  volume?: string
  issue?: string
  authors: string[]
  abstract: string
  doi: string
  full_text_available: boolean
  url?: string
}

/**
 * 检索执行时的上下文信息。
 */
export interface PaperRetrievalSearchMeta {
  provider_id: string
  resolved_api_key_ref_id: string | null
  api_key_resolved: boolean
  rate_limit_tier: 'default' | 'elevated'
  latency_ms: number
}

/**
 * 通用检索结果。
 */
export interface PaperRetrievalSearchResult {
  provider_id: string
  query: string
  sort: PaperRetrievalSortOption
  total_found: number
  items: PaperRetrievalPaperItem[]
  meta: PaperRetrievalSearchMeta
}

/**
 * Paper Retrieval 的 Preload API 契约。
 */
export interface PaperRetrievalAPI {
  listProviders: () => Promise<ApiResponse<PaperRetrievalProviderDescriptor[]>>
  getProviderDescriptor: (
    providerId: string
  ) => Promise<ApiResponse<PaperRetrievalProviderDescriptor>>
  search: (request: PaperRetrievalSearchRequest) => Promise<ApiResponse<PaperRetrievalSearchResult>>
}
