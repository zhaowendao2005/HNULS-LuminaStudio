import type { PaperRetrievalProviderDescriptor } from '../../../../preload/types/paper-retrieval.types'
import { PubmedProvider } from './pubmed-provider'
import type { PaperRetrievalProvider } from './types'

const PROVIDERS: PaperRetrievalProvider[] = [new PubmedProvider()]

const PROVIDER_MAP = new Map(PROVIDERS.map((provider) => [provider.descriptor.id, provider]))

/**
 * 获取全部 provider 实例。
 */
export function getPaperRetrievalProviders(): PaperRetrievalProvider[] {
  return [...PROVIDERS]
}

/**
 * 获取全部 provider 描述信息。
 */
export function getPaperRetrievalProviderDescriptors(): PaperRetrievalProviderDescriptor[] {
  return PROVIDERS.map((provider) => provider.descriptor)
}

/**
 * 根据 providerId 获取 provider。
 */
export function getPaperRetrievalProvider(providerId: string): PaperRetrievalProvider | null {
  return PROVIDER_MAP.get(providerId) ?? null
}
