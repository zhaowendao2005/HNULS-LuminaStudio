/**
 * ======================================================================
 * Knowledge-QA LangGraph —— 基于知识库+工具节点的问答状态机（双分支规划版）
 * ======================================================================
 *
 * 概述
 * ----------------------------------------------------------------------
 * 本模块使用 LangGraph（@langchain/langgraph）构建一个"显式编排"的
 * 知识库问答流程。所有控制流由 Graph 拓扑决定，而非让 LLM 自行选择是否
 * 调用工具，因此流程确定、可观测、可迭代优化。
 *
 * Graph 拓扑（双分支规划）
 * ----------------------------------------------------------------------
 *
 *   START ──► router ──┬──► initial-planning ──► user-interaction ──► execute-tools ──► summary ──┬──► END
 *                      │                                                    ▲                     │
 *                      │    (iteration > 0)                                 │  (shouldLoop=true)  │
 *                      └──► loop-planning ──────────────────────────────────┘                     │
 *                                ▲                                                                │
 *                                └────────────────────────────────────────────────────────────────┘
 *
 * 五个语义节点（NodeKind）
 * ----------------------------------------------------------------------
 * 1) router (内部) —— 根据 iteration 决定走 initial-planning 还是 loop-planning
 *
 * 2) initial-planning (Structure Node) —— 首轮深度规划器（需用户审批）
 *    - 使用 initialPlanModel 配置的 LLM
 *    - 规划后输出待审批的交互请求，通过 user-interaction 节点寻求用户批准
 *
 * 3) user-interaction (Structure Node) —— 通用用户交互节点
 *    - 暂停 graph 等待用户响应（approve / reject / modify）
 *    - 用户可选择方案、输入补充意见
 *
 * 4) loop-planning (Structure Node) —— 回环规划器（无需审批）
 *    - 使用 loopPlanModel 配置的 LLM
 *    - summary 打回后直接规划，不经过用户审批
 *
 * 5) execute-tools (内部编排节点) —— 工具执行器
 *
 * 6) summary (Structure Node) —— 通用总结器
 *
 * 工具注册机制
 * ----------------------------------------------------------------------
 * 与旧版相同：通过 registeredTools 数组注册，descriptor + nodeFactory。
 *
 * 回环策略
 * ----------------------------------------------------------------------
 * 最大迭代轮次可通过 KnowledgeQaModelConfig.graph.maxIterations 配置。
 *
 * 事件协议（emit）
 * ----------------------------------------------------------------------
 * 每个节点在执行前后分别 emit：
 *   invoke:node-start / invoke:node-result / invoke:node-error
 * 用户交互节点额外 emit：
 *   invoke:user-interaction-request
 * 最终答案通过 invoke:text-delta 发出。
 */

import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type {
  LangchainClientChatMessage,
  LangchainClientToMainMessage,
  UserInteractionResponsePayload
} from '@shared/langchain-client.types'
import type { AgentRuntime } from '../../factory'
import type { AgentModelGraphContext } from '../types'
import { buildChatModelFromProvider } from '../../model-factory'
import { runPlanning, type PlanningOutput } from '../../nodes/structure-planning/planning.node'
import { runSummary, type SummaryOutput } from '../../nodes/structure-summary/summary.node'
import {
  requestUserInteraction,
  type UserInteractionRequest
} from '../../nodes/structure-user-interaction'
import { knowledgeRetrievalReg } from '../../nodes/utils-knowledge'
import { pubmedSearchReg } from '../../nodes/utils-pubmed'
import type { ToolExecutionResult, UtilNodeRegistration } from '../../nodes/types'

const MAX_ITERATIONS = 3
const MAX_TOOL_CALLS_PER_ITERATION = 10

// ======================================================================
// LangGraph State 定义
// ======================================================================

const State = Annotation.Root({
  requestId: Annotation<string>(),
  input: Annotation<string>(),
  history: Annotation<LangchainClientChatMessage[]>({
    value: (_left, right) => right,
    default: () => []
  }),
  abortSignal: Annotation<AbortSignal | undefined>(),

  iteration: Annotation<number>({
    value: (_left, right) => right,
    default: () => 0
  }),

  planningInput: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  }),

  plan: Annotation<PlanningOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  /** 待审批的用户交互请求（由 initial-planning 生成，user-interaction 消费） */
  pendingInteraction: Annotation<UserInteractionRequest | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  /** 用户的审批响应 */
  userResponse: Annotation<UserInteractionResponsePayload | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  toolResults: Annotation<ToolExecutionResult[]>({
    value: (_left, right) => right,
    default: () => []
  }),

  decision: Annotation<SummaryOutput | null>({
    value: (_left, right) => right,
    default: () => null
  }),

  fullText: Annotation<string>({
    value: (_left, right) => right,
    default: () => ''
  })
})

/**
 * 构建 Knowledge-QA LangGraph 状态机（双分支规划版）。
 */
export function buildKnowledgeQaGraph(params: AgentModelGraphContext) {
  const knowledgeQaConfig = params.modelConfig?.knowledgeQa

  if (
    !knowledgeQaConfig ||
    !knowledgeQaConfig.initialPlanModel.provider ||
    !knowledgeQaConfig.initialPlanModel.modelId ||
    !knowledgeQaConfig.loopPlanModel.provider ||
    !knowledgeQaConfig.loopPlanModel.modelId ||
    !knowledgeQaConfig.summaryModel.provider ||
    !knowledgeQaConfig.summaryModel.modelId
  ) {
    throw new Error('Knowledge-QA 配置缺失：请设置首轮规划模型、回环规划模型与总结模型')
  }

  const maxIterations = Math.max(
    1,
    Math.floor(knowledgeQaConfig.graph?.maxIterations ?? MAX_ITERATIONS)
  )

  // 为三个模型分别创建 ChatModel 实例
  const initialPlanModel = buildChatModelFromProvider(
    knowledgeQaConfig.initialPlanModel.provider,
    knowledgeQaConfig.initialPlanModel.modelId
  )

  const loopPlanModel = buildChatModelFromProvider(
    knowledgeQaConfig.loopPlanModel.provider,
    knowledgeQaConfig.loopPlanModel.modelId
  )

  const summaryModel = buildChatModelFromProvider(
    knowledgeQaConfig.summaryModel.provider,
    knowledgeQaConfig.summaryModel.modelId
  )

  // ====================================================================
  // 工具注册表
  // ====================================================================

  const registeredTools: UtilNodeRegistration[] = [
    {
      ...knowledgeRetrievalReg,
      nodeFactory: (systemParams: any) =>
        knowledgeRetrievalReg.nodeFactory({
          apiBaseUrl: params.runtime.knowledgeApiUrl,
          retrieval: knowledgeQaConfig.retrieval,
          abortSignal: systemParams.abortSignal
        })
    },
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
  // 辅助：通用规划执行函数（initial & loop 共用）
  // ====================================================================
  async function executePlanning(
    state: typeof State.State,
    model: any,
    modelConfig: typeof knowledgeQaConfig.initialPlanModel,
    nodeKind: 'initial_planning' | 'planning',
    label: string
  ): Promise<PlanningOutput> {
    const planningInput = state.planningInput?.trim() || state.input
    const nodeId = `${nodeKind}:${state.requestId}:${state.iteration}`

    params.emit({
      type: 'invoke:node-start',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind,
        label,
        uiHint: { component: 'planning', title: label },
        modelId: modelConfig.modelId ?? undefined,
        inputs: { userInput: state.input, planningInput, iteration: state.iteration }
      }
    })

    let plan: PlanningOutput
    try {
      plan = await runPlanning({
        model,
        userInput: state.input,
        planningInput,
        availableTools: registeredTools.map((r) => r.descriptor),
        systemPromptInstruction: modelConfig.systemPromptInstruction,
        systemPromptConstraint: modelConfig.systemPromptConstraint
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      params.emit({
        type: 'invoke:node-error',
        requestId: state.requestId,
        payload: {
          nodeId,
          nodeKind,
          label,
          modelId: modelConfig.modelId ?? undefined,
          error: { message: `规划节点失败: ${msg}` }
        }
      })
      plan = {
        rationale: '规划节点失败：已回退为默认计划（使用知识库检索）',
        toolCalls: [{ toolId: 'knowledge_retrieval', params: { query: planningInput, k: 3 } }]
      }
    }

    // 规范化
    const normalizedPlan: PlanningOutput = {
      rationale: plan.rationale,
      toolCalls: (plan.toolCalls ?? [])
        .filter((c) => c && typeof c.toolId === 'string' && c.toolId.trim())
        .slice(0, MAX_TOOL_CALLS_PER_ITERATION)
        .map((c) => ({ toolId: c.toolId.trim(), params: c.params ?? {} }))
    }
    if (normalizedPlan.toolCalls.length === 0) {
      normalizedPlan.toolCalls = [
        { toolId: 'knowledge_retrieval', params: { query: planningInput, k: 3 } }
      ]
    }

    params.emit({
      type: 'invoke:node-result',
      requestId: state.requestId,
      payload: {
        nodeId,
        nodeKind,
        label,
        modelId: modelConfig.modelId ?? undefined,
        outputs: { ...normalizedPlan }
      }
    })

    return normalizedPlan
  }

  // ====================================================================
  // 节点：首轮深度规划（initial-planning）
  // ====================================================================
  const initialPlanNode = async (state: typeof State.State) => {
    const planningInput = state.planningInput?.trim() || state.input

    const plan = await executePlanning(
      state,
      initialPlanModel as any,
      knowledgeQaConfig.initialPlanModel,
      'initial_planning',
      '首轮深度规划'
    )

    // 构建交互请求：将规划结果展示给用户审批
    const optionsList = plan.toolCalls.map((call, idx) => ({
      id: `plan-option-${idx}`,
      label: `方案 ${idx + 1}: ${call.toolId}`,
      description: Object.entries(call.params)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(', ')
    }))

    const interactionMessage = [
      '## 研究规划',
      '',
      plan.rationale ? `**规划思路：** ${plan.rationale}` : '',
      '',
      '我计划使用以下工具进行检索，请审阅并决定是否批准：',
      '',
      ...plan.toolCalls.map(
        (call, idx) =>
          `${idx + 1}. **${call.toolId}** — ${Object.entries(call.params)
            .map(([k, v]) => `\`${k}\`: ${JSON.stringify(v)}`)
            .join(', ')}`
      ),
      '',
      '您可以批准当前方案、修改后批准（在输入框中补充意见），或拒绝重新规划。'
    ]
      .filter(Boolean)
      .join('\n')

    const pendingInteraction: UserInteractionRequest = {
      message: interactionMessage,
      options: optionsList,
      requiresTextInput: true,
      metadata: { plan }
    }

    return {
      planningInput,
      plan,
      pendingInteraction
    }
  }

  // ====================================================================
  // 节点：用户交互（user-interaction）
  // ====================================================================
  const userInteractionNode = async (state: typeof State.State) => {
    if (!state.pendingInteraction) {
      return { userResponse: null }
    }

    const response = await requestUserInteraction({
      emit: params.emit,
      requestId: state.requestId,
      nodeId: `user-interaction:${state.requestId}:${state.iteration}`,
      interactionRequest: state.pendingInteraction,
      waitForResponse: params.waitForResponse,
      abortSignal: state.abortSignal
    })

    // 根据用户响应调整计划
    if (response.action === 'reject') {
      // 用户拒绝：输出拒绝消息并结束
      const rejectText = '用户拒绝了当前研究计划。如需重新规划，请重新提出问题。'
      params.emit({
        type: 'invoke:text-delta',
        requestId: state.requestId,
        delta: rejectText
      })
      return {
        userResponse: response,
        pendingInteraction: null,
        fullText: rejectText
      }
    }

    if (response.action === 'modify' && response.textInput) {
      // 用户修改：将补充意见合入 planningInput，保持原计划但可能被后续处理调整
      return {
        userResponse: response,
        pendingInteraction: null,
        planningInput: `${state.planningInput}\n\n用户补充意见：${response.textInput}`
      }
    }

    // approve：直接通过
    return {
      userResponse: response,
      pendingInteraction: null
    }
  }

  // ====================================================================
  // 节点：回环规划（loop-planning）—— 无需审批
  // ====================================================================
  const loopPlanNode = async (state: typeof State.State) => {
    const planningInput = state.planningInput?.trim() || state.input

    const plan = await executePlanning(
      state,
      loopPlanModel as any,
      knowledgeQaConfig.loopPlanModel,
      'planning',
      '回环规划'
    )

    return {
      planningInput,
      plan,
      pendingInteraction: null,
      userResponse: null
    }
  }

  // ====================================================================
  // 节点：工具执行（execute-tools）—— 与旧版相同
  // ====================================================================
  const executeToolsNode = async (state: typeof State.State) => {
    const toolCalls = state.plan?.toolCalls ?? []
    if (toolCalls.length === 0) {
      return { toolResults: state.toolResults }
    }

    const tasks = toolCalls.map(async (call, idx): Promise<ToolExecutionResult> => {
      const nodeId = `execute-tool:${state.requestId}:${state.iteration}:${idx}`
      const reg = registeredTools.find((r) => r.descriptor.id === call.toolId)

      if (!reg) {
        const fallbackText = JSON.stringify({ error: `未找到节点: ${call.toolId}` })
        return { nodeId: call.toolId, params: call.params, resultText: fallbackText }
      }

      params.emit({
        type: 'invoke:node-start',
        requestId: state.requestId,
        payload: {
          nodeId,
          nodeKind: call.toolId as any,
          label: reg.descriptor.name,
          uiHint: {
            component: call.toolId === 'knowledge_retrieval' ? 'knowledge-search' : 'pubmed-search',
            title: reg.descriptor.name
          },
          inputs: { ...call.params, iteration: state.iteration, index: idx }
        }
      })

      try {
        const node = reg.nodeFactory({ abortSignal: state.abortSignal })
        const resultText = await node.run(call.params)

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
            outputs: { result: resultText }
          }
        })

        return { nodeId: call.toolId, params: call.params, resultText }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        params.emit({
          type: 'invoke:node-error',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: call.toolId as any,
            label: reg.descriptor.name,
            error: { message: `工具执行异常: ${msg}` }
          }
        })

        const fallback = JSON.stringify({
          toolId: call.toolId,
          params: call.params,
          error: `工具执行异常: ${msg}`
        })

        params.emit({
          type: 'invoke:node-result',
          requestId: state.requestId,
          payload: {
            nodeId,
            nodeKind: call.toolId as any,
            label: reg.descriptor.name,
            outputs: { result: fallback }
          }
        })

        return { nodeId: call.toolId, params: call.params, resultText: fallback }
      }
    })

    const results = await Promise.all(tasks)
    return { toolResults: [...(state.toolResults ?? []), ...results] }
  }

  // ====================================================================
  // 节点：总结与判断（summary）—— 与旧版逻辑相同
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
        modelId: knowledgeQaConfig.summaryModel.modelId ?? undefined,
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
          modelId: knowledgeQaConfig.summaryModel.modelId ?? undefined,
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
        modelId: knowledgeQaConfig.summaryModel.modelId ?? undefined,
        outputs: { ...decision }
      }
    })

    // A) 不需要回环 → 输出最终答案
    if (!decision.shouldLoop) {
      params.emit({
        type: 'invoke:text-delta',
        requestId: state.requestId,
        delta: decision.message
      })
      return { decision, fullText: decision.message }
    }

    // B) 需要回环但已达上限 → 输出降级答案
    if (state.iteration >= maxIterations - 1) {
      const finalText = `已达到最大迭代次数（${maxIterations}），仍不足以回答该问题。\n\n建议下一步检索方向：${decision.message}`
      params.emit({ type: 'invoke:text-delta', requestId: state.requestId, delta: finalText })
      return { decision, fullText: finalText }
    }

    // C) 需要回环且仍有次数 → 推进到下一迭代
    return {
      decision,
      iteration: state.iteration + 1,
      planningInput: decision.message
    }
  }

  // ====================================================================
  // Graph 拓扑组装（双分支规划）
  // ====================================================================
  //
  //   START ──► router ──┬──► initial-planning ──► user-interaction ──┬──► execute-tools ──► summary
  //                      │                                            │         ▲                │
  //                      └──► loop-planning ──────────────────────────┘         │                │
  //                                ▲                                            │                │
  //                                └──────────────── (shouldLoop) ◄─────────────┘────────────────┘
  //                                                                                (fullText) ──► END
  //
  const graph = new StateGraph(State)
    .addNode('initial-planning', initialPlanNode)
    .addNode('user-interaction', userInteractionNode)
    .addNode('loop-planning', loopPlanNode)
    .addNode('execute-tools', executeToolsNode)
    .addNode('summary', summaryNode)
    // START → router: 根据 iteration 走不同分支
    .addConditionalEdges(
      START,
      (state: typeof State.State) => {
        return state.iteration === 0 ? 'initial' : 'loop'
      },
      {
        initial: 'initial-planning',
        loop: 'loop-planning'
      }
    )
    // initial-planning → user-interaction → execute-tools（条件：非 reject）
    .addEdge('initial-planning', 'user-interaction')
    .addConditionalEdges(
      'user-interaction',
      (state: typeof State.State) => {
        // 如果用户拒绝或 fullText 已设置（reject 场景），直接结束
        if (state.fullText && String(state.fullText).trim()) return 'end'
        return 'execute'
      },
      {
        execute: 'execute-tools',
        end: END
      }
    )
    // loop-planning → execute-tools
    .addEdge('loop-planning', 'execute-tools')
    // execute-tools → summary
    .addEdge('execute-tools', 'summary')
    // summary → END or loop
    .addConditionalEdges(
      'summary',
      (state: typeof State.State) => {
        const hasFinal = Boolean(state.fullText && String(state.fullText).trim())
        return hasFinal ? 'end' : 'loop'
      },
      {
        loop: 'loop-planning',
        end: END
      }
    )
    .compile()

  return graph
}
