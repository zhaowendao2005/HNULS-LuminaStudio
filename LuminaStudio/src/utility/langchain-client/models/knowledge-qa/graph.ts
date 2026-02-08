/**
 * ======================================================================
 * Knowledge-QA LangGraph —— 基于知识库的问答状态机
 * ======================================================================
 *
 * 概述
 * ----------------------------------------------------------------------
 * 本模块使用 LangGraph（@langchain/langgraph）构建一个"显式编排"的
 * 知识库问答流程。所有控制流由 Graph 拓扑决定，而非让 LLM 自行选择是否
 * 调用工具，因此流程确定、可观测、可迭代优化。
 *
 * Graph 拓扑
 * ----------------------------------------------------------------------
 *
 *   START ──► planning ──► retrieve ──► summary ──┬──► END
 *                 ▲                                │
 *                 └──── (shouldLoop=true) ◄────────┘
 *
 * 三个语义节点（NodeKind）
 * ----------------------------------------------------------------------
 * 1) retrieval_plan  —— 检索规划
 *    调用 LLM 生成检索计划（queries + k），不执行实际检索。
 *    支持通过 KnowledgeQaModelSelectorConfig.systemPromptInstruction /
 *    systemPromptConstraint 自定义 Prompt。
 *
 * 2) knowledge_retrieval —— 知识库检索
 *    并行执行规划节点产出的检索句（上限 MAX_RETRIEVES_PER_ITERATION）。
 *    每条检索的 topK 受用户配置 knowledgeQaConfig.retrieval.topK 约束，
 *    默认回退到 KNOWLEDGE_RETRIEVAL_MAX_K。
 *
 * 3) retrieval_summary —— 总结与判断
 *    汇总全部检索证据，由 LLM 判断是否足以回答：
 *      - shouldLoop = false → message 为最终答案，流程结束
 *      - shouldLoop = true  → message 为下一轮规划的补充方向，回环至 planning
 *
 * 回环策略
 * ----------------------------------------------------------------------
 * - 最大迭代轮次可通过 KnowledgeQaModelConfig.graph.maxIterations 配置，
 *   默认 {@link MAX_ITERATIONS}（3 轮）。
 * - 到达上限后即使 shouldLoop=true 也会输出降级答案并结束。
 *
 * 事件协议（emit）
 * ----------------------------------------------------------------------
 * 每个节点在执行前后分别 emit：
 *   invoke:node-start  —— 节点开始（含输入摘要）
 *   invoke:node-result —— 节点完成（含输出摘要）
 *   invoke:node-error  —— 节点异常（容错后仍会继续）
 * 最终答案通过 invoke:text-delta 发出，renderer 侧显示为 assistant 文本。
 *
 * 依赖关系
 * ----------------------------------------------------------------------
 * - {@link runRetrievalPlanning}      —— 规划节点核心逻辑（retrieval-plan.node）
 * - {@link runKnowledgeRetrieval}     —— 检索节点核心逻辑（knowledge-retrieval.node）
 * - {@link runSummaryDecision}        —— 总结节点核心逻辑（summary-decision.node）
 * - {@link buildChatModelFromProvider} —— 根据 provider + modelId 创建 ChatOpenAI 实例
 * - {@link AgentRuntime}              —— 运行时上下文（提供 knowledgeApiUrl 等）
 */

import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type {
  LangchainClientChatMessage,
  LangchainClientRetrievalConfig,
  LangchainClientRetrievalPlanOutput,
  LangchainClientSummaryDecisionOutput,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type { AgentRuntime } from '../../factory'
import { buildChatModelFromProvider } from '../../model-factory'
import {
  runKnowledgeRetrieval,
  KNOWLEDGE_RETRIEVAL_MAX_K
} from '../../nodes/knowledge/knowledge-retrieval.node'
import { runRetrievalPlanning } from '../../nodes/planning/retrieval-plan.node'
import {
  runSummaryDecision,
  type RetrievalExecutionResult
} from '../../nodes/summary/summary-decision.node'

/**
 * 默认最大迭代轮次（planning → retrieve → summary 为一轮）。
 * 可被 KnowledgeQaModelConfig.graph.maxIterations 覆盖。
 */
const MAX_ITERATIONS = 3

/**
 * 单轮内最多并行检索次数。
 * 规划节点可能输出超过此数量的检索句，超出部分会在 planNode 中被截断。
 */
const MAX_RETRIEVES_PER_ITERATION = 10

// ======================================================================
// LangGraph State 定义
// ======================================================================
//
// State 是 Graph 中所有节点共享的上下文对象。
// 每个节点函数接收当前 State，返回一个"增量更新对象"；
// LangGraph 会自动将增量合并回 State，供下一个节点读取。
//
// Annotation 的 `value` 回调定义合并策略（此处均为"右覆盖"），
// `default` 回调提供初始值。

const State = Annotation.Root({
  // ————— 请求上下文（由调用方在 graph.invoke() 时一次性传入） —————

  /** 本次请求的唯一 ID，用于 emit 事件中标识请求 */
  requestId: Annotation<string>(),

  /** 用户原始输入（全流程不可变） */
  input: Annotation<string>(),

  /** 对话历史（预留，当前节点暂未消费） */
  history: Annotation<LangchainClientChatMessage[]>({
    value: (_left, right) => right,
    default: () => []
  }),

  /**
   * 检索配置快照（scopes + fileKeys 等），
   * 由前端 SourcesTab 选择后传入，供检索节点构造 API 请求。
   */
  retrieval: Annotation<LangchainClientRetrievalConfig | undefined>(),

  /** 取消信号：用户点击"停止生成"时触发，传递给 fetch 以中断网络请求 */
  abortSignal: Annotation<AbortSignal | undefined>(),

  // ————— 回环控制与中间产物 —————

  /** 当前迭代轮次（从 0 开始，每次回环 +1） */
  iteration: Annotation<number>({
    value: (_left, right) => right,
    default: () => 0
  }),

  /**
   * 规划节点的输入文本。
   * - 首轮 = 用户原始问题（state.input）
   * - 后续轮 = 上一轮 summary 节点输出的"缺口/补充方向"
   */
  planningInput: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  }),

  /** 当前轮规划节点的输出（检索计划），供检索节点消费 */
  plan: Annotation<LangchainClientRetrievalPlanOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  /**
   * 全部检索结果的累积列表（跨迭代保留）。
   * summary 节点会综合所有已有结果进行判断，避免重复检索。
   */
  retrievalResults: Annotation<RetrievalExecutionResult[]>({
    value: (_left, right) => right,
    default: () => []
  }),

  /** summary 节点的判断结果（shouldLoop + message） */
  decision: Annotation<LangchainClientSummaryDecisionOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  // ————— 最终输出 —————

  /**
   * 最终答案文本。
   * - 非空字符串时表示流程已产出结果，条件边据此判断走 END。
   * - 空字符串（默认）表示尚未结束，条件边据此回环到 planning。
   */
  fullText: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  })
})

/**
 * 构建 Knowledge-QA LangGraph 状态机。
 *
 * 该函数读取 KnowledgeQaModelConfig 中的配置，创建两个 ChatModel 实例
 * （planModel / summaryModel），定义三个节点函数，并组装为一个可 invoke 的
 * CompiledStateGraph。
 *
 * @param params.runtime   - AgentRuntime，提供 knowledgeApiUrl 等运行时信息
 * @param params.emit      - 事件发送回调，用于向 Main 进程推送节点状态与最终文本
 * @param params.modelConfig.knowledgeQa - Knowledge-QA 专属配置，包含：
 *   - planModel:    规划节点的 LLM 选择（provider + modelId + 可选自定义 Prompt）
 *   - summaryModel: 总结节点的 LLM 选择（同上）
 *   - retrieval:    检索参数（topK / enableRerank / rerankModelId / rerankTopN）
 *   - graph:        图级参数（maxIterations）
 *
 * @returns CompiledStateGraph —— 调用方通过 graph.invoke(initialState) 启动流程
 *
 * @throws 当 knowledgeQaConfig 缺失或 planModel / summaryModel 未配置时抛出错误
 */
export function buildKnowledgeQaGraph(params: {
  runtime: AgentRuntime
  emit: (msg: LangchainClientToMainMessage) => void
  modelConfig?: {
    knowledgeQa?: import('@shared/langchain-client.types').KnowledgeQaModelConfig
  }
}) {
  const knowledgeQaConfig = params.modelConfig?.knowledgeQa

  if (
    !knowledgeQaConfig ||
    !knowledgeQaConfig.planModel.provider ||
    !knowledgeQaConfig.planModel.modelId ||
    !knowledgeQaConfig.summaryModel.provider ||
    !knowledgeQaConfig.summaryModel.modelId
  ) {
    throw new Error('Knowledge-QA 配置缺失：请设置规划模型与总结模型')
  }

  // 从用户配置中读取可配置参数，回退到默认常量
  const maxIterations = Math.max(
    1,
    Math.floor(knowledgeQaConfig.graph?.maxIterations ?? MAX_ITERATIONS)
  )

  const maxK = Math.max(
    1,
    Math.floor(knowledgeQaConfig.retrieval?.topK ?? KNOWLEDGE_RETRIEVAL_MAX_K)
  )

  // 分别为规划节点和总结节点创建独立的 ChatModel 实例（可使用不同 provider/model）
  const planModel = buildChatModelFromProvider(
    knowledgeQaConfig.planModel.provider,
    knowledgeQaConfig.planModel.modelId
  )

  const summaryModel = buildChatModelFromProvider(
    knowledgeQaConfig.summaryModel.provider,
    knowledgeQaConfig.summaryModel.modelId
  )

  // ====================================================================
  // 节点 1：检索规划（retrieval_plan）
  // ====================================================================
  //
  // 职责：调用 planModel 生成检索计划（queries + k），不执行实际检索。
  // 容错：LLM 调用失败时回退为默认计划（planningInput 作为唯一检索句）。
  // 规范化：对 LLM 输出做二次校验——截断超额检索句、clamp k 值。
  const planNode = async (state: typeof State.State) => {
    const planningInput = state.planningInput?.trim() || state.input
    const nodeId = `retrieval_plan:${state.requestId}:${state.iteration}`

    // emit: 节点开始
    params.emit({
      type: 'invoke:node-start',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'retrieval_plan',
        label: '检索规划',
        uiHint: { component: 'retrieval-plan', title: '检索规划' },
        modelId: knowledgeQaConfig.planModel.modelId,
        inputs: {
          userInput: state.input,
          planningInput,
          maxK,
          iteration: state.iteration
        }
      }
    })

    // 调用 LLM 生成检索计划
    let plan: LangchainClientRetrievalPlanOutput
    try {
      plan = await runRetrievalPlanning({
        model: planModel as any,
        userInput: state.input,
        planningInput,
        retrieval: state.retrieval,
        maxK,
        systemPromptInstruction: knowledgeQaConfig.planModel.systemPromptInstruction,
        systemPromptConstraint: knowledgeQaConfig.planModel.systemPromptConstraint
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      // emit: 节点错误（回退默认计划，不中断流程）
      params.emit({
        type: 'invoke:node-error',
        requestId: state.requestId,
        payload: {
          nodeId,
          nodeKind: 'retrieval_plan',
          label: '检索规划',
          uiHint: { component: 'retrieval-plan', title: '检索规划' },
          modelId: knowledgeQaConfig.planModel.modelId,
          error: { message: `规划节点失败: ${msg}` }
        }
      })

      plan = {
        maxK,
        rationale: '规划节点失败：已回退为默认计划（使用 planningInput 作为唯一检索句）',
        queries: [{ query: planningInput, k: maxK }]
      }
    }

    // 二次规范化：截断到 MAX_RETRIEVES_PER_ITERATION 条、clamp k ∈ [1, maxK]
    const normalizedPlan: LangchainClientRetrievalPlanOutput = {
      maxK: Math.min(maxK, Math.max(1, plan.maxK || maxK)),
      rationale: plan.rationale,
      queries: (plan.queries ?? [])
        .filter((q) => q && typeof q.query === 'string' && q.query.trim())
        .slice(0, MAX_RETRIEVES_PER_ITERATION)
        .map((q) => ({
          query: q.query.trim(),
          k: Math.min(maxK, Math.max(1, Math.floor(q.k || maxK)))
        }))
    }

    if (normalizedPlan.queries.length === 0) {
      normalizedPlan.queries = [{ query: planningInput, k: maxK }]
    }

    // emit: 节点完成
    params.emit({
      type: 'invoke:node-result',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'retrieval_plan',
        label: '检索规划',
        uiHint: { component: 'retrieval-plan', title: '检索规划' },
        modelId: knowledgeQaConfig.planModel.modelId,
        outputs: {
          ...normalizedPlan
        }
      }
    })

    // 返回增量 State
    return {
      planningInput,
      plan: normalizedPlan
    }
  }

  // ====================================================================
  // 节点 2：知识库检索（knowledge_retrieval）
  // ====================================================================
  //
  // 职责：根据 state.plan.queries 并行执行多条检索。
  // 并行策略：Promise.all，上限 MAX_RETRIEVES_PER_ITERATION。
  // 每条检索独立 emit node-start / node-result（或 node-error），
  // 前端据此渲染多条 KnowledgeSearchMessage。
  // 结果累积：新结果追加到 state.retrievalResults（跨迭代保留），
  // 供 summary 节点综合判断。
  const retrieveNode = async (state: typeof State.State) => {
    const queries = state.plan?.queries ?? []
    const limited = queries.slice(0, MAX_RETRIEVES_PER_ITERATION)

    if (limited.length === 0) {
      return { retrievalResults: state.retrievalResults }
    }

    const tasks = limited.map(async (q, idx): Promise<RetrievalExecutionResult> => {
      const nodeId = `knowledge_retrieval:${state.requestId}:${state.iteration}:${idx}`

      params.emit({
        type: 'invoke:node-start',
        requestId: state.requestId,
        payload: {
          nodeId,
          nodeKind: 'knowledge_retrieval',
          label: '知识库检索',
          uiHint: { component: 'knowledge-search', title: '知识库检索' },
          rerankModelId: knowledgeQaConfig.retrieval?.rerankModelId,
          inputs: {
            query: q.query,
            k: q.k,
            iteration: state.iteration,
            index: idx
          }
        }
      })

      try {
        const resultText = await runKnowledgeRetrieval({
          apiBaseUrl: params.runtime.knowledgeApiUrl,
          query: q.query,
          k: q.k,
          retrieval: state.retrieval,
          maxK,
          abortSignal: state.abortSignal
        })

        params.emit({
          type: 'invoke:node-result',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: 'knowledge_retrieval',
            label: '知识库检索',
            uiHint: { component: 'knowledge-search', title: '知识库检索' },
            rerankModelId: knowledgeQaConfig.retrieval?.rerankModelId,
            outputs: {
              result: resultText
            }
          }
        })

        return { query: q.query, k: q.k, resultText }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        params.emit({
          type: 'invoke:node-error',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: 'knowledge_retrieval',
            label: '知识库检索',
            uiHint: { component: 'knowledge-search', title: '知识库检索' },
            rerankModelId: knowledgeQaConfig.retrieval?.rerankModelId,
            error: { message: `检索节点异常: ${msg}` }
          }
        })

        // 异常时构造一个结构合法的 fallback JSON，保证前端 UI 不崩溃
        const fallback = JSON.stringify({
          query: q.query,
          totalScopes: 0,
          scopes: [
            {
              knowledgeBaseId: 0,
              tableName: '',
              fileKeysCount: 0,
              error: `检索节点异常: ${msg}`
            }
          ]
        })

        params.emit({
          type: 'invoke:node-result',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: 'knowledge_retrieval',
            label: '知识库检索',
            uiHint: { component: 'knowledge-search', title: '知识库检索' },
            rerankModelId: knowledgeQaConfig.retrieval?.rerankModelId,
            outputs: { result: fallback }
          }
        })

        return { query: q.query, k: q.k, resultText: fallback }
      }
    })

    const results = await Promise.all(tasks)

    // 累积策略：保留所有迭代的检索结果，供 summary 节点综合判断
    return {
      retrievalResults: [...(state.retrievalResults ?? []), ...results]
    }
  }

  // ====================================================================
  // 节点 3：总结与判断（retrieval_summary）
  // ====================================================================
  //
  // 职责：调用 summaryModel 汇总所有检索证据，输出 shouldLoop + message。
  // 编排逻辑（在本节点内完成，而非交给条件边）：
  //   A) shouldLoop=false → emit 最终答案，写入 state.fullText → 条件边走 END
  //   B) shouldLoop=true 且已达上限 → emit 降级答案 → END
  //   C) shouldLoop=true 且仍有次数 → 更新 planningInput + iteration → 条件边回 planning
  const summaryNode = async (state: typeof State.State) => {
    const nodeId = `retrieval_summary:${state.requestId}:${state.iteration}`

    params.emit({
      type: 'invoke:node-start',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'retrieval_summary',
        label: '总结与判断',
        uiHint: { component: 'retrieval-summary', title: '总结与判断' },
        modelId: knowledgeQaConfig.summaryModel.modelId,
        inputs: {
          userInput: state.input,
          planningInput: state.planningInput?.trim() || state.input,
          iteration: state.iteration,
          maxIterations,
          resultsCount: state.retrievalResults?.length ?? 0
        }
      }
    })

    let decision: LangchainClientSummaryDecisionOutput
    try {
      decision = await runSummaryDecision({
        model: summaryModel as any,
        userInput: state.input,
        planningInput: state.planningInput?.trim() || state.input,
        iteration: state.iteration,
        results: state.retrievalResults ?? [],
        maxIterations,
        systemPromptInstruction: knowledgeQaConfig.summaryModel.systemPromptInstruction,
        systemPromptConstraint: knowledgeQaConfig.summaryModel.systemPromptConstraint
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      params.emit({
        type: 'invoke:node-error',
        requestId: state.requestId,
        payload: {
          nodeId,
          nodeKind: 'retrieval_summary',
          label: '总结与判断',
          uiHint: { component: 'retrieval-summary', title: '总结与判断' },
          modelId: knowledgeQaConfig.summaryModel.modelId,
          error: { message: `总结节点失败: ${msg}` }
        }
      })

      decision = {
        shouldLoop: false,
        message: '总结节点调用失败，无法可靠生成最终答案。建议重试或缩小问题范围。'
      }
    }

    params.emit({
      type: 'invoke:node-result',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'retrieval_summary',
        label: '总结与判断',
        uiHint: { component: 'retrieval-summary', title: '总结与判断' },
        modelId: knowledgeQaConfig.summaryModel.modelId,
        outputs: {
          ...decision
        }
      }
    })

    // ===== 编排逻辑 =====

    // A) 不需要回环 → 输出最终答案
    if (!decision.shouldLoop) {
      params.emit({
        type: 'invoke:text-delta',
        requestId: state.requestId,
        delta: decision.message
      })
      return {
        decision,
        fullText: decision.message
      }
    }

    // B) 需要回环但已达上限 → 输出降级答案
    if (state.iteration >= maxIterations - 1) {
      const finalText = `已达到最大迭代次数（${maxIterations}），仍不足以回答该问题。\n\n建议下一步检索方向：${decision.message}`
      params.emit({ type: 'invoke:text-delta', requestId: state.requestId, delta: finalText })
      return {
        decision,
        fullText: finalText
      }
    }

    // C) 需要回环且仍有次数 → 推进到下一迭代
    return {
      decision,
      iteration: state.iteration + 1,
      planningInput: decision.message
    }
  }

  // ====================================================================
  // Graph 拓扑组装
  // ====================================================================
  //
  //   START ──► planning ──► retrieve ──► summary
  //                 ▲                        │
  //                 │   (fullText 为空)       │
  //                 └────── loop ◄────────────┤
  //                                          │   (fullText 非空)
  //                                          └──────► END
  //
  // 条件边判断依据：state.fullText 是否为非空字符串。
  // - 非空 → 'end'（流程结束）
  // - 空   → 'loop'（回环至 planning 开始下一轮迭代）
  const graph = new StateGraph(State)
    .addNode('planning', planNode)
    .addNode('retrieve', retrieveNode)
    .addNode('summary', summaryNode)
    .addEdge(START, 'planning')
    .addEdge('planning', 'retrieve')
    .addEdge('retrieve', 'summary')
    .addConditionalEdges(
      'summary',
      (state: typeof State.State) => {
        const hasFinal = Boolean(state.fullText && String(state.fullText).trim())
        return hasFinal ? 'end' : 'loop'
      },
      {
        loop: 'planning',
        end: END
      }
    )
    .compile()

  return graph
}
