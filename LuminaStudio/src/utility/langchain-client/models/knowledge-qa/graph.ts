/**
 * ======================================================================
 * Knowledge QA LangGraph 状态机 - 显式编排版（规划 → 并行检索 → 总结/判断）
 * ======================================================================
 *
 * 为什么要这样改？（给新同事/小白看的）
 * ----------------------------------------------------------------------
 * 旧版实现依赖 `runtime.agent.stream()`，让 LLM 自己决定要不要调用工具。
 * 这种方式的缺点是：
 * - 控制流不稳定：模型可能不调用检索，或者调用次数不可控
 * - UI 不好做：中间步骤不“语义化”，只能 hack toolName
 *
 * 本版改成“显式编排”：
 * - 我们在 graph 里规定清楚：先规划、再检索、再总结。
 * - 节点之间互不耦合（单一职责），由 graph 负责把它们串起来。
 *
 * 三个核心节点（语义节点 / NodeKind）
 * ----------------------------------------------------------------------
 * 1) retrieval_plan
 *    - 用 LLM 生成检索计划（queries + k）
 *    - 不执行检索
 *
 * 2) knowledge_retrieval
 *    - 执行检索计划里的 query（并行最多 10 次）
 *    - 每次检索的 k 会被检索节点硬编码 MAX_K clamp（当前 3）
 *
 * 3) retrieval_summary
 *    - 用 LLM 汇总检索证据，并判断是否足够回答
 *    - 输出 shouldLoop + message
 *      - shouldLoop=false: message 是最终答案（给用户）
 *      - shouldLoop=true : message 是下一轮规划的输入（给规划节点）
 *
 * 回环策略
 * ----------------------------------------------------------------------
 * - 如果 shouldLoop=true → 回到规划节点
 * - 最多迭代 3 轮（避免死循环）
 *
 * 事件输出
 * ----------------------------------------------------------------------
 * - 每个节点会 emit：invoke:node-start / invoke:node-result / invoke:node-error
 * - 最终答案会 emit：invoke:text-delta（前端显示为 assistant 文本）
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
 * 最多迭代轮次（plan→retrieve→summary 算一轮）
 */
const MAX_ITERATIONS = 3

/**
 * 单轮最多并行检索次数
 */
const MAX_RETRIEVES_PER_ITERATION = 10

/**
 * ======================================================================
 * LangGraph State 定义
 * ======================================================================
 *
 * State 是图里所有节点共享的“上下文”。
 * 每个节点读取 State，返回一段“增量更新”，LangGraph 会把更新合并回 State。
 */
const State = Annotation.Root({
  // ===== 请求上下文 =====
  requestId: Annotation<string>(),
  input: Annotation<string>(),

  history: Annotation<LangchainClientChatMessage[]>({
    value: (_left, right) => right,
    default: () => []
  }),

  retrieval: Annotation<LangchainClientRetrievalConfig | undefined>(),
  abortSignal: Annotation<AbortSignal | undefined>(),

  // ===== 回环/中间产物 =====
  iteration: Annotation<number>({
    value: (_left, right) => right,
    default: () => 0
  }),

  /**
   * planningInput：规划节点的输入（可能是用户问题，也可能是上一轮 summary 输出的“缺口/方向”）
   */
  planningInput: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  }),

  plan: Annotation<LangchainClientRetrievalPlanOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  retrievalResults: Annotation<RetrievalExecutionResult[]>({
    value: (_left, right) => right,
    default: () => []
  }),

  decision: Annotation<LangchainClientSummaryDecisionOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  // ===== 最终输出 =====
  fullText: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  })
})

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

  const maxIterations = Math.max(
    1,
    Math.floor(knowledgeQaConfig.graph?.maxIterations ?? MAX_ITERATIONS)
  )

  const maxK = Math.max(
    1,
    Math.floor(knowledgeQaConfig.retrieval?.topK ?? KNOWLEDGE_RETRIEVAL_MAX_K)
  )

  const planModel = buildChatModelFromProvider(
    knowledgeQaConfig.planModel.provider,
    knowledgeQaConfig.planModel.modelId
  )

  const summaryModel = buildChatModelFromProvider(
    knowledgeQaConfig.summaryModel.provider,
    knowledgeQaConfig.summaryModel.modelId
  )
  /**
   * 节点 1：规划节点（retrieval_plan）
   */
  const planNode = async (state: typeof State.State) => {
    const planningInput = state.planningInput?.trim() || state.input
    const nodeId = `retrieval_plan:${state.requestId}:${state.iteration}`

    // 1) 通知前端：节点开始
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

    // 2) 调用 LLM 生成计划（并做容错）
    let plan: LangchainClientRetrievalPlanOutput
    try {
      plan = await runRetrievalPlanning({
        model: planModel as any,
        userInput: state.input,
        planningInput,
        retrieval: state.retrieval,
        maxK
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      // 通知前端：节点错误（但我们会回退一个默认 plan，不让流程直接崩）
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

    // 3) 二次规范化：最多 10 条、k clamp
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

    // 4) 通知前端：节点完成
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

    // 5) 更新 State（供下一节点使用）
    return {
      planningInput,
      plan: normalizedPlan
    }
  }

  /**
   * 节点 2：并行检索节点（knowledge_retrieval）
   *
   * 注意：这里是“并行执行多个检索”，但每一次检索都会 emit 一对 node-start/node-result。
   * 前端会看到多条 KnowledgeSearchMessage（每条对应一个 query）。
   */
  const retrieveNode = async (state: typeof State.State) => {
    const queries = state.plan?.queries ?? []
    const limited = queries.slice(0, MAX_RETRIEVES_PER_ITERATION)

    if (limited.length === 0) {
      // 没有计划就不检索
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
              // 前端 KnowledgeSearchMessage 只关心 outputs.result
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

        // 发生异常时，也返回一个“可解析的 JSON”，保证 UI 不崩
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

    // Promise.all = 并行执行所有检索
    const results = await Promise.all(tasks)

    // 默认策略：累积所有检索结果（跨迭代也保留），供 summary 节点综合判断
    return {
      retrievalResults: [...(state.retrievalResults ?? []), ...results]
    }
  }

  /**
   * 节点 3：总结与判断节点（retrieval_summary）
   */
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
        results: state.retrievalResults ?? []
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

    // ===== 根据 decision 做编排（graph 的职责） =====

    // A) 不需要回环：输出最终答案并结束
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

    // B) 需要回环，但已到最大轮次：输出降级答案并结束
    if (state.iteration >= maxIterations - 1) {
      const finalText = `已达到最大迭代次数（${maxIterations}），仍不足以回答该问题。\n\n建议下一步检索方向：${decision.message}`
      params.emit({ type: 'invoke:text-delta', requestId: state.requestId, delta: finalText })
      return {
        decision,
        fullText: finalText
      }
    }

    // C) 需要回环且仍有次数：更新 planningInput + iteration，然后让 conditional edge 回到 plan
    return {
      decision,
      iteration: state.iteration + 1,
      planningInput: decision.message
    }
  }

  /**
   * ======================================================================
   * Graph 拓扑
   * ======================================================================
   * START → planning → retrieve → summary → (loop to planning) / END
   */
  const graph = new StateGraph(State)
    .addNode('planning', planNode)
    .addNode('retrieve', retrieveNode)
    .addNode('summary', summaryNode)
    .addEdge(START, 'planning')
    .addEdge('planning', 'retrieve')
    .addEdge('retrieve', 'summary')
    // 条件边：只要 summary 没给 fullText（说明要回环），就回到 planning
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
