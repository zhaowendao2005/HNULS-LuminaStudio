import type {
  PaperRetrievalSearchRequest,
  PaperRetrievalSearchResult,
  NormalChatAgentToolName
} from '@preload/types'
import type { z } from 'zod'

export interface NormalChatFunctioncallExecuteContext {
  requestId: string
  topicId: string
  agentId: string
  depth: number
  providerId: string
  modelId: string
  signal: AbortSignal
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
}

export interface NormalChatFunctioncallRegistryDependencies {
  paperRetrievalService: {
    search(request: PaperRetrievalSearchRequest): Promise<PaperRetrievalSearchResult>
  }
}

export interface NormalChatFunctioncallHelper<TArgs = unknown, TResult = unknown> {
  id: NormalChatAgentToolName
  displayName: string
  description: string
  schemaPrompt: string
  progressivePrompt: string
  argsSchema: z.ZodType<TArgs>
  execute(args: TArgs, context: NormalChatFunctioncallExecuteContext): Promise<TResult>
  summarizeResult(result: TResult): string
  summarizeFailure(error: unknown): string
}

export interface NormalChatFunctioncallRegistry {
  listHelpers(): NormalChatFunctioncallHelper[]
  getHelper(helperId: string): NormalChatFunctioncallHelper | null
  requireHelper(helperId: string): NormalChatFunctioncallHelper
}
