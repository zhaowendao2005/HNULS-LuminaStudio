import type {
  PaperRetrievalProviderDescriptor,
  PaperRetrievalSearchRequest,
  PaperRetrievalSearchResult,
  PaperRetrievalSortOption
} from '../../../../preload/types/paper-retrieval.types'

/**
 * 解析到的 API Key 信息。
 */
export interface ResolvedPaperRetrievalApiKey {
  refId: string | null
  value: string | null
}

/**
 * provider 执行时可使用的上下文。
 */
export interface PaperRetrievalProviderContext {
  apiKey: ResolvedPaperRetrievalApiKey
  abortSignal?: AbortSignal
}

/**
 * provider 对输入参数的归一化结果。
 *
 * 这样 service 层只负责做 provider 选择与 key 解析，具体字段校验留在 provider 内。
 */
export interface PaperRetrievalProviderNormalizedParams {
  query: string
  sort: PaperRetrievalSortOption
  startDate: string | null
  endDate: string | null
  limit: number
  rawOptions: Record<string, unknown>
}

/**
 * provider 的统一协议。
 */
export interface PaperRetrievalProvider {
  readonly descriptor: PaperRetrievalProviderDescriptor

  normalizeRequest(request: PaperRetrievalSearchRequest): PaperRetrievalProviderNormalizedParams

  search(
    normalizedParams: PaperRetrievalProviderNormalizedParams,
    context: PaperRetrievalProviderContext
  ): Promise<PaperRetrievalSearchResult>
}

/**
 * 用户设置服务的最小协作接口。
 *
 * 这里只声明本域真正依赖的方法，避免越界耦合 user-settings 的完整实现。
 */
export interface PaperRetrievalUserSettingsResolver {
  getSettings(): Promise<unknown>
}

/**
 * 可被扫描的 API Key 注册项最小结构。
 */
export interface ApiKeyRegistryEntryLike {
  id?: unknown
  key?: unknown
  refId?: unknown
  value?: unknown
  apiKey?: unknown
  secret?: unknown
  token?: unknown
}

/**
 * provider 运行失败时抛出的业务错误。
 */
export class PaperRetrievalValidationError extends Error {}

/**
 * provider 未找到时抛出的错误。
 */
export class PaperRetrievalProviderNotFoundError extends Error {}
