import type { NormalChatFunctionCallMessagePart, NormalChatSubAgentMessagePart } from '@preload/types'
import { NormalChatKgRetrievalExecutor } from '../functioncall/kg-retrieval/executor'
import { NormalChatKnowledgeRetrievalExecutor } from '../functioncall/knowledge-retrieval/executor'
import { NormalChatPubmedSearchExecutor } from '../functioncall/pubmed-search/executor'
import {
  NormalChatDispatchSubAgentExecutor,
  type NormalChatDispatchSubAgentRunner
} from '../system/dispatch-sub-agent/executor'
import { NormalChatGetActionSpecExecutor } from '../system/get-action-spec/executor'
import type {
  NormalChatActionCall,
  NormalChatActionExecutorOutput,
  NormalChatActionRuntimeContext,
  NormalChatActionTranscriptVisibility,
  NormalChatResolvedAction
} from './action.types'
import type { NormalChatActionResultRecord } from './action-result-projection'
import { getNormalChatActionDefinition } from './action-registry'
import type { NormalChatActionSchemaDebugSnapshot } from './action-runtime.types'
import type {
  NormalChatActionFeedback,
  NormalChatActionExecutionBatchResult
} from '../../agent/memory/assistant-round-memory.types'

export interface NormalChatExecuteActionInput {
  call: NormalChatActionCall
  resolvedActions: NormalChatResolvedAction[]
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
  context: NormalChatActionRuntimeContext
  transcriptPartId?: string
}

export interface NormalChatExecutedAction {
  actionRunId?: string
  resultRecord: NormalChatActionResultRecord
  loadedActionKeys: string[]
  transcriptVisibility: NormalChatActionTranscriptVisibility
  functionCallPart: NormalChatFunctionCallMessagePart
  subagentPart?: NormalChatSubAgentMessagePart | null
  feedback: NormalChatActionFeedback[]
  childSummaries: Array<{
    childAgentRunId: string
    summaryMarkdown: string
  }>
  schemaDebugSnapshot: NormalChatActionSchemaDebugSnapshot | null
}

export class NormalChatActionExecutorService {
  private readonly getActionSpecExecutor = new NormalChatGetActionSpecExecutor()
  private dispatchSubAgentExecutor: NormalChatDispatchSubAgentExecutor | null = null

  constructor(
    private readonly pubmedSearchExecutor: NormalChatPubmedSearchExecutor,
    private readonly knowledgeRetrievalExecutor?: NormalChatKnowledgeRetrievalExecutor,
    private readonly kgRetrievalExecutor?: NormalChatKgRetrievalExecutor
  ) {}

  setSubAgentRunner(subAgentRunner: NormalChatDispatchSubAgentRunner): void {
    this.dispatchSubAgentExecutor = new NormalChatDispatchSubAgentExecutor(subAgentRunner)
  }

  async execute(input: NormalChatExecuteActionInput): Promise<NormalChatExecutedAction> {
    const resolvedAction = input.resolvedActions.find(
      (action) => action.actionKey === input.call.actionKey
    )
    const definition = getNormalChatActionDefinition(input.call.actionKey)

    if (!resolvedAction || !definition) {
      return this.buildErrorResult(input, {
        title: input.call.actionKey,
        status: 'unknown_action',
        retryable: false,
        message: `Action is not enabled for this agent: ${input.call.actionKey}`,
        schemaDebugSnapshot: definition?.debugSchemaSnapshot ?? null,
        transcriptVisibility: definition?.descriptor.transcriptVisibility ?? 'inline'
      })
    }

    const parsedInput = definition.inputSchema?.safeParse(input.call.input)
    if (definition.inputSchema && parsedInput && !parsedInput.success) {
      return this.buildErrorResult(input, {
        title: definition.descriptor.title,
        status: 'schema_error',
        retryable: true,
        message: parsedInput.error.issues.map((issue) => issue.message).join('; '),
        schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null,
        transcriptVisibility: definition.descriptor.transcriptVisibility ?? 'inline'
      })
    }

    let normalizedInput = parsedInput && parsedInput.success ? parsedInput.data : input.call.input

    if (definition.validateInput) {
      const validation = await definition.validateInput(normalizedInput, input.context)
      if (!validation.ok) {
        return this.buildErrorResult(input, {
          title: definition.descriptor.title,
          status: validation.kind === 'schema' ? 'schema_error' : 'validation_error',
          retryable: validation.retryable,
          message: validation.message,
          schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null,
          transcriptVisibility: definition.descriptor.transcriptVisibility ?? 'inline'
        })
      }
      if (validation.normalizedInput && typeof validation.normalizedInput === 'object') {
        normalizedInput = validation.normalizedInput as Record<string, unknown>
      }
    }

    if (definition.checkPermissions) {
      const permission = await definition.checkPermissions(normalizedInput, input.context)
      if (permission.behavior === 'deny') {
        return this.buildErrorResult(input, {
          title: definition.descriptor.title,
          status: 'permission_denied',
          retryable: permission.retryable,
          message: permission.message,
          schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null,
          transcriptVisibility: definition.descriptor.transcriptVisibility ?? 'inline'
        })
      }
      if (permission.updatedInput && typeof permission.updatedInput === 'object') {
        normalizedInput = permission.updatedInput as Record<string, unknown>
      }
    }

    try {
      const output = await this.runExecutor({
        call: { ...input.call, input: normalizedInput },
        context: input.context,
        transcriptPartId: input.transcriptPartId
      })

      const resultRecord: NormalChatActionResultRecord = {
        actionKey: input.call.actionKey,
        title: definition.descriptor.title,
        status: 'success',
        retryable: false,
        inputJson: JSON.stringify(normalizedInput, null, 2),
        outputJson: JSON.stringify(output, null, 2),
        errorMessage: null,
        modelFacingSummaryMd: this.buildModelFacingSummary(
          input.call.actionKey,
          definition.descriptor.title,
          output
        ),
        output
      }

      return {
        resultRecord,
        loadedActionKeys:
          input.call.actionKey === 'system.get_action_spec'
            ? [String((normalizedInput.action_key ?? '') || '')]
            : [],
        transcriptVisibility: definition.descriptor.transcriptVisibility ?? 'inline',
        functionCallPart: {
          kind: 'functioncall',
          callId: `${input.call.actionKey}-${input.roundIndex}-${input.parallelIndex}`,
          functionCallName: input.call.actionKey,
          title: definition.descriptor.title,
          status: 'success',
          input: JSON.stringify(normalizedInput, null, 2),
          output: JSON.stringify(output, null, 2),
          errorMessage: null,
          isStreaming: false,
          roundIndex: input.roundIndex,
          batchIndex: input.batchIndex,
          parallelIndex: input.parallelIndex,
          depth: input.depth,
          decisionReason: definition.descriptor.description
        },
        subagentPart:
          input.call.actionKey === 'system.dispatch_sub_agent' && input.transcriptPartId
            ? {
                kind: 'subagent' as const,
                partId: input.transcriptPartId,
                goal: String(normalizedInput.goal ?? ''),
                childAgentRunId:
                  'childAgentRunId' in output && typeof output.childAgentRunId === 'string'
                    ? output.childAgentRunId
                    : null,
                roundIndex: input.roundIndex,
                batchIndex: input.batchIndex,
                parallelIndex: input.parallelIndex,
                depth: input.depth,
                status: 'completed' as const
              }
            : null,
        feedback: [],
        childSummaries: this.extractChildSummaries(output),
        schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null
      }
    } catch (error) {
      return this.buildErrorResult(input, {
        title: definition.descriptor.title,
        status: 'execution_error',
        retryable: false,
        message: error instanceof Error ? error.message : String(error),
        schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null,
        transcriptVisibility: definition.descriptor.transcriptVisibility ?? 'inline'
      })
    }
  }

  createBatchResult(items: NormalChatExecutedAction[]): NormalChatActionExecutionBatchResult {
    return {
      results: items.map((item) => item.resultRecord),
      feedback: items.flatMap((item) => item.feedback),
      childSummaries: items.flatMap((item) => item.childSummaries),
      executedActionRunIds: items
        .map((item) => item.actionRunId)
        .filter((item): item is string => Boolean(item))
    }
  }

  private buildErrorResult(
    input: NormalChatExecuteActionInput,
    options: {
      title: string
      status:
        | 'schema_error'
        | 'validation_error'
        | 'permission_denied'
        | 'execution_error'
        | 'unknown_action'
      retryable: boolean
      message: string
      schemaDebugSnapshot: NormalChatActionSchemaDebugSnapshot | null
      transcriptVisibility: NormalChatActionTranscriptVisibility
    }
  ): NormalChatExecutedAction {
    const resultRecord: NormalChatActionResultRecord = {
      actionKey: input.call.actionKey,
      title: options.title,
      status: options.status,
      retryable: options.retryable,
      inputJson: JSON.stringify(input.call.input, null, 2),
      outputJson: null,
      errorMessage: options.message,
      modelFacingSummaryMd: `Action ${input.call.actionKey} failed: ${options.message}`,
      output: null
    }

    return {
      resultRecord,
      loadedActionKeys: [],
      transcriptVisibility: options.transcriptVisibility,
      functionCallPart: {
        kind: 'functioncall',
        callId: `${input.call.actionKey}-${input.roundIndex}-${input.parallelIndex}`,
        functionCallName: input.call.actionKey,
        title: options.title,
        status: 'error',
        input: JSON.stringify(input.call.input, null, 2),
        output: '',
        errorMessage: options.message,
        isStreaming: false,
        roundIndex: input.roundIndex,
        batchIndex: input.batchIndex,
        parallelIndex: input.parallelIndex,
        depth: input.depth,
        decisionReason: 'Action execution failed.'
      },
      subagentPart:
        input.call.actionKey === 'system.dispatch_sub_agent' && input.transcriptPartId
          ? {
              kind: 'subagent' as const,
              partId: input.transcriptPartId,
              goal: String(input.call.input.goal ?? ''),
              childAgentRunId: null,
              roundIndex: input.roundIndex,
              batchIndex: input.batchIndex,
              parallelIndex: input.parallelIndex,
              depth: input.depth,
              status: 'failed' as const
            }
          : null,
      feedback: [
        {
          actionKey: input.call.actionKey,
          title: options.title,
          status: options.status,
          retryable: options.retryable,
          message: options.message,
          fixHint: null,
          roundIndex: input.roundIndex
        }
      ],
      childSummaries: [],
      schemaDebugSnapshot: options.schemaDebugSnapshot
    }
  }

  private buildModelFacingSummary(
    actionKey: string,
    title: string,
    output: NormalChatActionExecutorOutput
  ): string {
    if (actionKey === 'system.dispatch_sub_agent') {
      if ('finalAnswer' in output && typeof output.finalAnswer === 'string' && output.finalAnswer) {
        return output.finalAnswer
      }
      if (
        'summaryMarkdown' in output &&
        typeof output.summaryMarkdown === 'string' &&
        output.summaryMarkdown
      ) {
        return output.summaryMarkdown
      }
    }

    return `### ${title}\n\n${JSON.stringify(output, null, 2)}`
  }

  private extractChildSummaries(output: NormalChatActionExecutorOutput): Array<{
    childAgentRunId: string
    summaryMarkdown: string
  }> {
    if (
      'childAgentRunId' in output &&
      typeof output.childAgentRunId === 'string' &&
      typeof output.summaryMarkdown === 'string'
    ) {
      return [
        {
          childAgentRunId: output.childAgentRunId,
          summaryMarkdown: output.summaryMarkdown
        }
      ]
    }

    return []
  }

  private async runExecutor(input: {
    call: NormalChatActionCall
    context: NormalChatActionRuntimeContext
    transcriptPartId?: string
  }): Promise<NormalChatActionExecutorOutput> {
    if (input.call.actionKey === 'system.get_action_spec') {
      return this.getActionSpecExecutor.execute(String(input.call.input.action_key ?? ''))
    }

    if (input.call.actionKey === 'system.dispatch_sub_agent') {
      if (!this.dispatchSubAgentExecutor) {
        throw new Error('Subagent runner is not configured.')
      }
      return this.dispatchSubAgentExecutor.execute({
        goal: String(input.call.input.goal ?? ''),
        enabledActionKeys: Array.isArray(input.call.input.enabled_action_keys)
          ? input.call.input.enabled_action_keys.map((item) => String(item))
          : [],
        parentActionRunId: input.context.actionRunId,
        pubmedMode: input.call.input.pubmed_mode === 'slow' ? 'slow' : 'fast',
        maxReactSteps: Math.max(1, Number(input.call.input.max_react_steps ?? 2)),
        transcriptPartId: input.transcriptPartId ?? ''
      })
    }

    if (input.call.actionKey === 'functioncall.pubmed_search') {
      return this.pubmedSearchExecutor.execute({
        query: String(input.call.input.query ?? ''),
        top_k: Math.max(1, Math.min(20, Number(input.call.input.top_k ?? 5))),
        sort: input.call.input.sort === 'pub_date' ? 'pub_date' : 'relevance',
        date_from: input.call.input.date_from ? String(input.call.input.date_from) : null,
        date_to: input.call.input.date_to ? String(input.call.input.date_to) : null,
        api_key_ref_id: input.call.input.api_key_ref_id
          ? String(input.call.input.api_key_ref_id)
          : null
      })
    }

    if (input.call.actionKey === 'functioncall.knowledge_retrieval') {
      if (!this.knowledgeRetrievalExecutor) {
        throw new Error('Knowledge retrieval executor is not configured.')
      }
      return this.knowledgeRetrievalExecutor.execute({
        knowledgeBaseId: Number(input.call.input.knowledgeBaseId),
        tableName: String(input.call.input.tableName ?? ''),
        queryText: String(input.call.input.queryText ?? ''),
        ...(input.call.input.fileKey ? { fileKey: String(input.call.input.fileKey) } : {}),
        ...(Array.isArray(input.call.input.fileKeys)
          ? { fileKeys: input.call.input.fileKeys.map((item) => String(item)) }
          : {}),
        ...(input.call.input.k !== undefined ? { k: Number(input.call.input.k) } : {}),
        ...(input.call.input.ef !== undefined ? { ef: Number(input.call.input.ef) } : {}),
        ...(input.call.input.rerankModelId
          ? { rerankModelId: String(input.call.input.rerankModelId) }
          : {}),
        ...(input.call.input.rerankTopN !== undefined
          ? { rerankTopN: Number(input.call.input.rerankTopN) }
          : {})
      })
    }

    if (input.call.actionKey === 'functioncall.kg_retrieval') {
      if (!this.kgRetrievalExecutor) {
        throw new Error('KG retrieval executor is not configured.')
      }
      return this.kgRetrievalExecutor.execute({
        graphTableBase: String(input.call.input.graphTableBase ?? ''),
        ...(typeof input.call.input.query === 'string' ? { query: input.call.input.query } : {}),
        ...(typeof input.call.input.mode === 'string' ? { mode: input.call.input.mode as any } : {}),
        ...(Array.isArray(input.call.input.highLevelKeywords)
          ? { highLevelKeywords: input.call.input.highLevelKeywords.map((item) => String(item)) }
          : {}),
        ...(Array.isArray(input.call.input.lowLevelKeywords)
          ? { lowLevelKeywords: input.call.input.lowLevelKeywords.map((item) => String(item)) }
          : {}),
        ...(input.call.input.rerank && typeof input.call.input.rerank === 'object'
          ? {
              rerank: {
                enabled: Boolean((input.call.input.rerank as any).enabled),
                ...((input.call.input.rerank as any).modelId
                  ? { modelId: String((input.call.input.rerank as any).modelId) }
                  : {}),
                ...((input.call.input.rerank as any).topN !== undefined
                  ? { topN: Number((input.call.input.rerank as any).topN) }
                  : {})
              }
            }
          : {})
      })
    }

    throw new Error(`Unsupported action key: ${input.call.actionKey}`)
  }
}
