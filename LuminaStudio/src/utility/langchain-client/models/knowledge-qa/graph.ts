/**
 * ======================================================================
 * Knowledge-QA LangGraph —— 基于知识库+工具节点的问答状态机（通用架构版）
 * ======================================================================
 *
 * 概述
 * ----------------------------------------------------------------------
 * 本模块使用 LangGraph（@langchain/langgraph）构建一个"显式编排"的
 * 知识库问答流程。所有控制流由 Graph 拓扑决定，而非让 LLM 自行选择是否
 * 调用工具,因此流程确定、可观测、可迭代优化。
 *
 * 与旧版的差异（重大改造）
 * ----------------------------------------------------------------------
 * **旧架构**：规划节点直接输出 `{ queries: [...] }`，检索节点硬编码消费
 * **新架构**：
 *   - 规划节点：输出通用 `{ toolCalls: [{ toolId, params }] }`，不关心具体工具
 *   - 工具注册：通过 descriptor 机制注册 utils-knowledge / utils-pubmed 等工具
 *   - 总结节点：消费通用 `ToolExecutionResult[]`，不关心来自哪个工具
 *
 * Graph 拓扑
 * ----------------------------------------------------------------------
 *
 *   START ──► planning ──► execute-tools ──► summary ──┬──► END
 *                 ▲                                     │
 *                 └──────── (shouldLoop=true) ◄─────────┘
 *
 * 三个语义节点（NodeKind）
 * ----------------------------------------------------------------------
 * 1) planning (Structure Node)  —— 通用规划器
 *    调用 LLM 根据工具描述生成工具调用计划（toolId + params）。
 *    支持通过 systemPromptInstruction / systemPromptConstraint 自定义 Prompt。
 *
 * 2) execute-tools (内部编排节点) —— 工具执行器
 *    根据规划节点输出的 toolCalls，查找已注册的工具节点并调用其 run() 方法。
 *    并行执行所有工具调用，输出 ToolExecutionResult[] 供总结节点消费。
 *
 * 3) summary (Structure Node) —— 通用总结器
 *    汇总所有工具执行结果，由 LLM 判断是否足以回答：
 *      - shouldLoop = false → message 为最终答案，流程结束
 *      - shouldLoop = true  → message 为下一轮规划的补充方向，回环至 planning
 *
 * 工具注册机制
 * ----------------------------------------------------------------------
 * - 所有工具节点必须通过 `registeredTools` 数组注册到 Graph
 * - 注册内容包含：
 *   - descriptor: 元数据（id, name, description, inputDescription, outputDescription）
 *   - nodeFactory: 节点实例创建函数（接收系统注入参数，返回节点实例）
 * - 规划节点的 Prompt 自动包含所有工具的 descriptor（供 LLM 选择工具）
 * - 执行节点通过 toolId 查找对应的 nodeFactory 并实例化后调用 run()
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
 * - {@link runPlanning}              —— 通用规划节点核心逻辑（structure-planning）
 * - {@link runSummary}               —— 通用总结节点核心逻辑（structure-summary）
 * - {@link knowledgeRetrievalReg}    —— 知识库检索工具注册（utils-knowledge）
 * - {@link pubmedSearchReg}          —— PubMed 检索工具注册（utils-pubmed）
 * - {@link buildChatModelFromProvider} —— 根据 provider + modelId 创建 ChatOpenAI 实例
 * - {@link AgentRuntime}             —— 运行时上下文（提供 knowledgeApiUrl 等）
 */

import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type {
  LangchainClientChatMessage,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type { AgentRuntime } from '../../factory'
import { buildChatModelFromProvider } from '../../model-factory'
import { runPlanning, type PlanningOutput } from '../../nodes/structure-planning/planning.node'
import { runSummary, type SummaryOutput } from '../../nodes/structure-summary/summary.node'
import { knowledgeRetrievalReg } from '../../nodes/utils-knowledge'
import { pubmedSearchReg } from '../../nodes/utils-pubmed'
import type { ToolExecutionResult, UtilNodeRegistration } from '../../nodes/types'

/**
 * 默认最大迭代轮次（planning → execute-tools → summary 为一轮）。
 * 可被 KnowledgeQaModelConfig.graph.maxIterations 覆盖。
 */
const MAX_ITERATIONS = 3

/**
 * 单轮内最多并行工具调用次数。
 * 规划节点可能输出超过此数量的工具调用，超出部分会在 planNode 中被截断。
 */
const MAX_TOOL_CALLS_PER_ITERATION = 10

// ======================================================================
// LangGraph State 定义
// ======================================================================

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

  /** 当前轮规划节点的输出（工具调用计划），供执行节点消费 */
  plan: Annotation<PlanningOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  /**
   * 全部工具执行结果的累积列表（跨迭代保留）。
   * summary 节点会综合所有已有结果进行判断，避免重复执行。
   */
  toolResults: Annotation<ToolExecutionResult[]>({
    value: (_left, right) => right,
    default: () => []
  }),

  /** summary 节点的判断结果（shouldLoop + message） */
  decision: Annotation<SummaryOutput | null>({
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
 *   - retrieval:    知识库检索参数（scope + fileKeys 等）
 *   - pubmed:       PubMed 检索参数（apiKey 等）
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
  // 工具注册表（Tool Registry）
  // ====================================================================
  //
  // 此处注册所有可用工具节点。
  // 注意：系统参数注入（如 apiBaseUrl / apiKey）在 nodeFactory 中完成，
  // 用户参数（如 query / retMax）由规划节点的 LLM 决策。

  const registeredTools: UtilNodeRegistration[] = [
    // 知识库检索工具
    {
      ...knowledgeRetrievalReg,
      nodeFactory: (systemParams: any) =>
        knowledgeRetrievalReg.nodeFactory({
          apiBaseUrl: params.runtime.knowledgeApiUrl,
          retrieval: knowledgeQaConfig.retrieval,
          abortSignal: systemParams.abortSignal
        })
    },

    // PubMed 检索工具
    {
      ...pubmedSearchReg,
      nodeFactory: (systemParams: any) =>
        pubmedSearchReg.nodeFactory({
          apiKey: knowledgeQaConfig?.pubmed?.apiKey,
          abortSignal: systemParams.abortSignal
        })
    }
  ]

  // ====================================================================
  // 节点 1：通用规划（planning）
  // ====================================================================
  const planNode = async (state: typeof State.State) => {
    const planningInput = state.planningInput?.trim() || state.input
    const nodeId = `planning:${state.requestId}:${state.iteration}`

    // emit: 节点开始
    params.emit({
      type: 'invoke:node-start',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'planning',
        label: '工具规划',
        uiHint: { component: 'planning', title: '工具规划' },
        modelId: knowledgeQaConfig.planModel.modelId,
        inputs: {
          userInput: state.input,
          planningInput,
          iteration: state.iteration
        }
      }
    })

    // 调用通用规划节点
    let plan: PlanningOutput
    try {
      plan = await runPlanning({
        model: planModel as any,
        userInput: state.input,
        planningInput,
        availableTools: registeredTools.map((r) => r.descriptor),
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
          nodeKind: 'planning',
          label: '工具规划',
          uiHint: { component: 'planning', title: '工具规划' },
          modelId: knowledgeQaConfig.planModel.modelId,
          error: { message: `规划节点失败: ${msg}` }
        }
      })

      // 容错：使用 knowledge_retrieval 作为默认工具
      plan = {
        rationale: '规划节点失败：已回退为默认计划（使用知识库检索）',
        toolCalls: [
          {
            toolId: 'knowledge_retrieval',
            params: { query: planningInput, k: 3 }
          }
        ]
      }
    }

    // 二次规范化：截断到 MAX_TOOL_CALLS_PER_ITERATION 条
    const normalizedPlan: PlanningOutput = {
      rationale: plan.rationale,
      toolCalls: (plan.toolCalls ?? [])
        .filter((call) => call && typeof call.toolId === 'string' && call.toolId.trim())
        .slice(0, MAX_TOOL_CALLS_PER_ITERATION)
        .map((call) => ({
          toolId: call.toolId.trim(),
          params: call.params ?? {}
        }))
    }

    if (normalizedPlan.toolCalls.length === 0) {
      // 回退默认：使用知识库检索
      normalizedPlan.toolCalls = [
        { toolId: 'knowledge_retrieval', params: { query: planningInput, k: 3 } }
      ]
    }

    // emit: 节点完成
    params.emit({
      type: 'invoke:node-result',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'planning',
        label: '工具规划',
        uiHint: { component: 'planning', title: '工具规划' },
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
  // 节点 2：工具执行（execute-tools）
  // ====================================================================
  const executeToolsNode = async (state: typeof State.State) => {
    const toolCalls = state.plan?.toolCalls ?? []

    if (toolCalls.length === 0) {
      return { toolResults: state.toolResults }
    }

    const tasks = toolCalls.map(async (call, idx): Promise<ToolExecutionResult> => {
      const nodeId = `execute-tool:${state.requestId}:${state.iteration}:${idx}`

      // 查找工具注册
      const reg = registeredTools.find((r) => r.descriptor.id === call.toolId)
      if (!reg) {
        const fallbackText = JSON.stringify({
          error: `未找到工具: ${call.toolId}`
        })
        return { toolId: call.toolId, params: call.params, resultText: fallbackText }
      }

      // emit: 节点开始
      params.emit({
        type: 'invoke:node-start',
        requestId: state.requestId,
        payload: {
          nodeId,
          nodeKind: call.toolId as any, // 使用 toolId 作为 nodeKind
          label: reg.descriptor.name,
          uiHint: {
            component: call.toolId === 'knowledge_retrieval' ? 'knowledge-search' : 'pubmed-search',
            title: reg.descriptor.name
          },
          inputs: {
            ...call.params,
            iteration: state.iteration,
            index: idx
          }
        }
      })

      try {
        // 实例化节点（注入系统参数）
        const node = reg.nodeFactory({
          abortSignal: state.abortSignal
        })

        // 调用节点的 run() 方法（传入用户参数）
        const resultText = await node.run(call.params)

        // emit: 节点完成
        params.emit({
          type: 'invoke:node-result',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: call.toolId as any,
            label: reg.descriptor.name,
            uiHint: {
              component:
                call.toolId === 'knowledge_retrieval' ? 'knowledge-search' : 'pubmed-search',
              title: reg.descriptor.name
            },
            outputs: {
              result: resultText
            }
          }
        })

        return { toolId: call.toolId, params: call.params, resultText }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        // emit: 节点错误
        params.emit({
          type: 'invoke:node-error',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: call.toolId as any,
            label: reg.descriptor.name,
            uiHint: {
              component:
                call.toolId === 'knowledge_retrieval' ? 'knowledge-search' : 'pubmed-search',
              title: reg.descriptor.name
            },
            error: { message: `工具执行异常: ${msg}` }
          }
        })

        // 异常时构造一个结构合法的 fallback JSON
        const fallback = JSON.stringify({
          toolId: call.toolId,
          params: call.params,
          error: `工具执行异常: ${msg}`
        })

        // emit: fallback 结果
        params.emit({
          type: 'invoke:node-result',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: call.toolId as any,
            label: reg.descriptor.name,
            uiHint: {
              component:
                call.toolId === 'knowledge_retrieval' ? 'knowledge-search' : 'pubmed-search',
              title: reg.descriptor.name
            },
            outputs: { result: fallback }
          }
        })

        return { toolId: call.toolId, params: call.params, resultText: fallback }
      }
    })

    const results = await Promise.all(tasks)

    // 累积策略：保留所有迭代的工具执行结果
    return {
      toolResults: [...(state.toolResults ?? []), ...results]
    }
  }

  // ====================================================================
  // 节点 3：总结与判断（summary）
  // ====================================================================
  const summaryNode = async (state: typeof State.State) => {
    const nodeId = `summary:${state.requestId}:${state.iteration}`

    params.emit({
      type: 'invoke:node-start',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind: 'summary',
        label: '总结与判断',
        uiHint: { component: 'summary', title: '总结与判断' },
        modelId: knowledgeQaConfig.summaryModel.modelId,
        inputs: {
          userInput: state.input,
          planningInput: state.planningInput?.trim() || state.input,
          iteration: state.iteration,
          maxIterations,
          resultsCount: state.toolResults?.length ?? 0
        }
      }
    })

    let decision: SummaryOutput
    try {
      decision = await runSummary({
        model: summaryModel as any,
        userInput: state.input,
        planningInput: state.planningInput?.trim() || state.input,
        iteration: state.iteration,
        results: state.toolResults ?? [],
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
          nodeKind: 'summary',
          label: '总结与判断',
          uiHint: { component: 'summary', title: '总结与判断' },
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
        nodeKind: 'summary',
        label: '总结与判断',
        uiHint: { component: 'summary', title: '总结与判断' },
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
  //   START ──► planning ──► execute-tools ──► summary
  //                 ▲                             │
  //                 │      (fullText 为空)         │
  //                 └────── loop ◄─────────────────┤
  //                                               │   (fullText 非空)
  //                                               └──────► END
  //
  // 条件边判断依据：state.fullText 是否为非空字符串。
  // - 非空 → 'end'（流程结束）
  // - 空   → 'loop'（回环至 planning 开始下一轮迭代）
  const graph = new StateGraph(State)
    .addNode('planning', planNode)
    .addNode('execute-tools', executeToolsNode)
    .addNode('summary', summaryNode)
    .addEdge(START, 'planning')
    .addEdge('planning', 'execute-tools')
    .addEdge('execute-tools', 'summary')
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
