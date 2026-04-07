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
import type { NormalChatFunctionCallMessagePart } from '@preload/types'
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
  NormalChatResolvedAction
} from './action.types'
import type { NormalChatActionResultRecord } from './action-result-projection'
import type {
  NormalChatActionFeedback,
  NormalChatActionExecutionBatchResult
} from '../../agent/memory/assistant-round-memory.types'
import { getNormalChatActionDefinition } from './action-registry'
import type { NormalChatActionSchemaDebugSnapshot } from './action-runtime.types'

/**
 * 执行动作的输入参数
 *
 * 包含动作调用信息、已解析的动作列表、轮次/批次索引等上下文。
 */
export interface NormalChatExecuteActionInput {
  /** 要执行的动作调用 */
  call: NormalChatActionCall
  /** 当前 agent 已启用的已解析动作列表 */
  resolvedActions: NormalChatResolvedAction[]
  /** 当前对话轮次索引 */
  roundIndex: number
  /** 批次索引（在所有批次中的位置） */
  batchIndex: number
  /** 并行索引（在同一批次内的位置） */
  parallelIndex: number
  /** Agent 嵌套深度 */
  depth: number
  /** 动作运行时上下文 */
  context: NormalChatActionRuntimeContext
}

/**
 * 已执行动作的结果
 *
 * 包含动作执行后的所有产出物：结果记录、加载的动作键、
 * 函数调用消息片段、反馈、子 Agent 摘要和 Schema 调试快照。
 */
export interface NormalChatExecutedAction {
  /** 当前动作运行 ID */
  actionRunId?: string
  /** 动作结果记录（用于持久化和展示） */
  resultRecord: NormalChatActionResultRecord
  /** 本次执行加载的动作键列表（仅 get_action_spec 动作会返回） */
  loadedActionKeys: string[]
  /** 函数调用消息片段（用于插入到对话消息流中） */
  functionCallPart: NormalChatFunctionCallMessagePart
  /** 动作执行反馈列表（错误时包含错误信息） */
  feedback: NormalChatActionFeedback[]
  /** 子 Agent 摘要列表（dispatch_sub_agent 动作的子 Agent 结果） */
  childSummaries: Array<{
    childAgentRunId: string
    summaryMarkdown: string
  }>
  /** Schema 调试快照（开发调试用） */
  schemaDebugSnapshot: NormalChatActionSchemaDebugSnapshot | null
}

/**
 * 动作执行器服务类
 *
 * 管理所有动作执行器的分发和执行。
 */
export class NormalChatActionExecutorService {
  /** 获取动作规格的执行器（始终可用） */
  private readonly getActionSpecExecutor = new NormalChatGetActionSpecExecutor()
  /** 分派子 Agent 的执行器（需通过 setSubAgentRunner 配置后才可用） */
  private dispatchSubAgentExecutor: NormalChatDispatchSubAgentExecutor | null = null

  /**
   * 构造函数
   * @param pubmedSearchExecutor - PubMed 文献检索执行器（通过依赖注入传入）
   */
  constructor(private readonly pubmedSearchExecutor: NormalChatPubmedSearchExecutor) {}

  /**
   * 设置子 Agent 运行器
   *
   * 配置 dispatch_sub_agent 动作的执行能力。
   * 必须在执行 dispatch_sub_agent 动作之前调用。
   *
   * @param subAgentRunner - 子 Agent 运行器回调函数
   */
  setSubAgentRunner(subAgentRunner: NormalChatDispatchSubAgentRunner): void {
    this.dispatchSubAgentExecutor = new NormalChatDispatchSubAgentExecutor(subAgentRunner)
  }

  /**
   * 执行单个动作调用
   *
   * 完整的动作执行流程：
   * 1. 查找动作定义 → 未找到则返回 unknown_action 错误
   * 2. Zod Schema 校验 → 失败则返回 schema_error
   * 3. 自定义输入验证 → 失败则返回 validation_error
   * 4. 权限检查 → 拒绝则返回 permission_denied
   * 5. 执行动作 → 异常则返回 execution_error
   * 6. 构建成功结果
   *
   * @param input - 执行动作的输入参数
   * @returns 已执行动作的结果对象
   */
  async execute(input: NormalChatExecuteActionInput): Promise<NormalChatExecutedAction> {
    // ── 1. 查找动作定义 ──
    const resolvedAction = input.resolvedActions.find(
      (action) => action.actionKey === input.call.actionKey
    )
    const definition = getNormalChatActionDefinition(input.call.actionKey)

    // 动作未启用或未注册 → 返回 unknown_action 错误
    if (!resolvedAction || !definition) {
      return this.buildErrorResult(input, {
        title: input.call.actionKey,
        status: 'unknown_action',
        retryable: false,
        message: `Action is not enabled for this agent: ${input.call.actionKey}`,
        schemaDebugSnapshot: definition?.debugSchemaSnapshot ?? null
      })
    }

    // ── 2. Zod Schema 校验 ──
    const parsedInput = definition.inputSchema?.safeParse(input.call.input)
    if (definition.inputSchema && parsedInput && !parsedInput.success) {
      return this.buildErrorResult(input, {
        title: definition.descriptor.title,
        status: 'schema_error',
        retryable: true,
        message: parsedInput.error.issues.map((issue) => issue.message).join('; '),
        schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null
      })
    }

    // 归一化输入：优先使用 Zod 解析后的数据
    let normalizedInput = parsedInput && parsedInput.success ? parsedInput.data : input.call.input

    // ── 3. 自定义输入验证 ──
    if (definition.validateInput) {
      const validation = await definition.validateInput(normalizedInput, input.context)
      if (!validation.ok) {
        return this.buildErrorResult(input, {
          title: definition.descriptor.title,
          status: validation.kind === 'schema' ? 'schema_error' : 'validation_error',
          retryable: validation.retryable,
          message: validation.message,
          schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null
        })
      }
      // 验证通过后，如果返回了归一化输入则更新
      if (validation.normalizedInput && typeof validation.normalizedInput === 'object') {
        normalizedInput = validation.normalizedInput as Record<string, unknown>
      }
    }

    // ── 4. 权限检查 ──
    if (definition.checkPermissions) {
      const permission = await definition.checkPermissions(normalizedInput, input.context)
      if (permission.behavior === 'deny') {
        return this.buildErrorResult(input, {
          title: definition.descriptor.title,
          status: 'permission_denied',
          retryable: permission.retryable,
          message: permission.message,
          schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null
        })
      }
      // 权限允许后，如果返回了更新后的输入则使用
      if (permission.updatedInput && typeof permission.updatedInput === 'object') {
        normalizedInput = permission.updatedInput as Record<string, unknown>
      }
    }

    // ── 5. 执行动作 ──
    try {
      const output = await this.runExecutor({
        call: {
          ...input.call,
          input: normalizedInput
        },
        context: input.context
      })

      // ── 6. 构建成功结果 ──
      const resultRecord: NormalChatActionResultRecord = {
        actionKey: input.call.actionKey,
        title: definition.descriptor.title,
        status: 'success',
        retryable: false,
        inputJson: JSON.stringify(normalizedInput, null, 2),
        outputJson: JSON.stringify(output, null, 2),
        errorMessage: null,
        modelFacingSummaryMd: this.buildModelFacingSummary(definition.descriptor.title, output),
        output
      }

      return {
        resultRecord,
        // 仅 get_action_spec 动作会加载新的动作键
        loadedActionKeys:
          input.call.actionKey === 'system.get_action_spec'
            ? [String((normalizedInput.action_key ?? '') || '')]
            : [],
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
        feedback: [],
        childSummaries: this.extractChildSummaries(output),
        schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null
      }
    } catch (error) {
      // 执行异常 → 返回 execution_error 错误
      return this.buildErrorResult(input, {
        title: definition.descriptor.title,
        status: 'execution_error',
        retryable: false,
        message: error instanceof Error ? error.message : String(error),
        schemaDebugSnapshot: definition.debugSchemaSnapshot ?? null
      })
    }
  }

  /**
   * 将多个已执行动作的结果聚合为批次结果
   *
   * @param items - 同一批次内所有已执行动作的列表
   * @returns 聚合后的批次结果（包含所有结果记录、反馈和子 Agent 摘要）
   */
  createBatchResult(items: NormalChatExecutedAction[]): NormalChatActionExecutionBatchResult {
    return {
      results: items.map((item) => item.resultRecord),
      feedback: items.flatMap((item) => item.feedback),
      childSummaries: items.flatMap((item) => item.childSummaries),
      executedActionRunIds: items.map((item) => item.actionRunId).filter((item): item is string => Boolean(item))
    }
  }

  /**
   * 构建错误结果
   *
   * 当动作执行过程中任何阶段失败时，统一构建错误结果对象。
   *
   * @param input - 原始执行输入
   * @param options - 错误选项（标题、状态、消息、是否可重试等）
   * @returns 包含错误信息的已执行动作结果
   */
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
   * 构建面向模型的执行结果摘要
   *
   * 将动作执行输出格式化为 Markdown，用于注入到后续的 prompt 中。
   *
   * @param title - 动作标题
   * @param output - 动作执行输出
   * @returns Markdown 格式的摘要字符串
   */
  private buildModelFacingSummary(title: string, output: NormalChatActionExecutorOutput): string {
    return `### ${title}\n\n${JSON.stringify(output, null, 2)}`
  }

  /**
   * 从动作输出中提取子 Agent 摘要
   *
   * 仅 dispatch_sub_agent 动作的输出包含 childAgentRunId 和 summaryMarkdown。
   *
   * @param output - 动作执行输出
   * @returns 子 Agent 摘要列表（非子 Agent 动作返回空数组）
   */
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

  /**
   * 根据动作键分发到对应的执行器
   *
   * 目前支持的动作：
   * - system.get_action_spec：获取指定动作的完整定义
   * - system.dispatch_sub_agent：分派子 Agent 执行任务
   * - functioncall.pubmed_search：PubMed 文献检索
   *
   * @param input - 包含归一化后输入的动作调用
   * @returns 动作执行输出
   * @throws 当动作键不被支持时抛出错误
   */
  private async runExecutor(input: {
    call: NormalChatActionCall
    context: NormalChatActionRuntimeContext
  }): Promise<NormalChatActionExecutorOutput> {
    // ── 获取动作规格 ──
    if (input.call.actionKey === 'system.get_action_spec') {
      return this.getActionSpecExecutor.execute(String(input.call.input.action_key ?? ''))
    }

    // ── 分派子 Agent ──
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
        maxReactSteps: Math.max(1, Number(input.call.input.max_react_steps ?? 2))
      })
    }

    // ── PubMed 文献检索 ──
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
