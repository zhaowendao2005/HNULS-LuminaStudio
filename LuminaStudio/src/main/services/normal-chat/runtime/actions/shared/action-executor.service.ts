/**
 * 动作执行器服务
 *
 * 负责执行单个动作调用的完整生命周期，包括：
 * 1. 动作解析：从注册表中查找动作定义
 * 2. Schema 校验：使用 Zod Schema 校验输入参数
 * 3. 业务验证：调用自定义 validateInput 回调
 * 4. 权限检查：调用 checkPermissions 回调
 * 5. 执行：分发到对应的执行器（get_action_spec / dispatch_sub_agent / pubmed_search）
 * 6. 结果构建：生成结果记录、函数调用消息片段、反馈等
 *
 * 同时提供批次结果聚合和错误结果构建的能力。
 */
import type { NormalChatFunctionCallMessagePart, NormalChatSubAgentMessagePart } from '@preload/types'
import { NormalChatGetActionSpecExecutor } from '../system/get-action-spec/executor'
import {
  NormalChatDispatchSubAgentExecutor,
  type NormalChatDispatchSubAgentRunner
} from '../system/dispatch-sub-agent/executor'
import { NormalChatPubmedSearchExecutor } from '../functioncall/pubmed-search/executor'
import type {
  NormalChatActionCall,
  NormalChatActionExecutorOutput,
  NormalChatActionRuntimeContext,
  NormalChatActionTranscriptVisibility,
  NormalChatResolvedAction
} from './action.types'
import type { NormalChatActionResultRecord } from './action-result-projection'
import type {
  NormalChatActionFeedback,
  NormalChatActionExecutionBatchResult
} from '../../agent/memory/assistant-round-memory.types'
import { getNormalChatActionDefinition } from './action-registry'
import type { NormalChatActionSchemaDebugSnapshot } from './action-runtime.types'

export interface NormalChatExecuteActionInput {
  call: NormalChatActionCall
  resolvedActions: NormalChatResolvedAction[]
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
  context: NormalChatActionRuntimeContext
  /** transcript part ID，用于dispatch_sub_agent关联子代理状态 */
  transcriptPartId?: string
}

export interface NormalChatExecutedAction {
  actionRunId?: string
  resultRecord: NormalChatActionResultRecord
  loadedActionKeys: string[]
  transcriptVisibility: NormalChatActionTranscriptVisibility
  functionCallPart: NormalChatFunctionCallMessagePart
  /** 子代理专用part，dispatch_sub_agent成功时填充 */
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

  constructor(private readonly pubmedSearchExecutor: NormalChatPubmedSearchExecutor) {}

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
        call: {
          ...input.call,
          input: normalizedInput
        },
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

  /**
   * 为主 agent 构建模型可见摘要。
   * 对于 subagent，直接把最后一轮 LLM 结果作为父 agent 的 action result 消费内容。
   */
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

    throw new Error(`Unsupported action key: ${input.call.actionKey}`)
  }
}
