/**
 * PubMed Search 工具节点注册
 */
import type { UtilNodeRegistration } from '../types'
import { runPubmedSearch } from './pubmed-search.node'
import { PUBMED_SEARCH_DESCRIPTOR } from '@prompt/pubmed-search.node.prompt'

export * from './pubmed-search.node'

export interface PubmedSearchSystemParams {
  apiKey?: string
  abortSignal?: AbortSignal
}

export interface PubmedSearchUserParams {
  query: string
  retMax?: number
}

export const pubmedSearchReg: UtilNodeRegistration = {
  descriptor: PUBMED_SEARCH_DESCRIPTOR,
  nodeFactory: (systemParams: PubmedSearchSystemParams) => ({
    run: async (userParams: PubmedSearchUserParams) => {
      return runPubmedSearch({
        ...systemParams,
        ...userParams
      })
    }
  })
}
