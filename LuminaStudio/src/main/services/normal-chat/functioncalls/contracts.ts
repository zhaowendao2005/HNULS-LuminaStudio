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

export interface NormalChatFunctioncallResultAssessment {
  quality: 'none' | 'weak' | 'useful'
  shouldContinue: boolean
  stopReason: string | null
}

export interface NormalChatFunctioncallHelper<TArgs = unknown, TResult = unknown> {
  id: NormalChatAgentToolName
  displayName: string
  description: string
  schemaPrompt: string
  progressivePrompt: string
  argsSchema: z.ZodType<TArgs>
  fingerprintArgs(args: TArgs): string
  execute(args: TArgs, context: NormalChatFunctioncallExecuteContext): Promise<TResult>
  summarizeResult(result: TResult): string
  assessResult(result: TResult): NormalChatFunctioncallResultAssessment
  summarizeFailure(error: unknown): string
}

export interface NormalChatFunctioncallRegistry {
  listHelpers(): NormalChatFunctioncallHelper[]
  getHelper(helperId: string): NormalChatFunctioncallHelper | null
  requireHelper(helperId: string): NormalChatFunctioncallHelper
}
