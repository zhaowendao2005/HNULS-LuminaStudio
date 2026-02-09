/**
 * ======================================================================
 * 规划节点 (Structure Node) - 通用工具调用规划器
 * ======================================================================
 *
 * 职责：
 * - 根据可用工具的 descriptor，让 LLM 决定"用哪些工具、传什么参数"
 * - 输出通用的 toolCalls 列表，供 graph 执行
 * - 对具体工具节点无感知，只看 descriptor 元数据
 *
 * 与旧版区别：
 * - 旧版：硬编码输出 queries[]，只能用于 knowledge_retrieval
 * - 新版：输出通用 toolCalls[]，可用于任意工具节点组合
 */

import type { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { UtilNodeDescriptor } from '../types'

export const PLANNING_MAX_TOOL_CALLS = 10

/**
 * 工具调用计划输出（通用格式）
 */
export interface PlanningOutput {
  /** LLM 的推理说明 */
  rationale?: string
  /** 工具调用列表 */
  toolCalls: Array<{
    toolId: string
    params: Record<string, unknown>
  }>
}

/**
 * 构建工具描述区（给 LLM 的 prompt）
 */
function buildToolDescriptionsPrompt(descriptors: UtilNodeDescriptor[]): string {
  if (descriptors.length === 0) {
    return '（无可用工具）'
  }

  return descriptors
    .map(
      (d, idx) =>
        `${idx + 1}. [${d.id}] ${d.name}
   功能：${d.description}
   输入：${d.inputDescription}
   输出：${d.outputDescription}`
    )
    .join('\n\n')
}

/**
 * 尝试从 LLM 输出中解析 JSON
 */
function parseJsonFromModel(text: string): any {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed)
  }

  const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)
  if (match?.[1]) {
    return JSON.parse(match[1].trim())
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
  }

  throw new Error('LLM output is not valid JSON')
}

/**
 * 运行规划节点
 */
export async function runPlanning(params: {
  model: ChatOpenAI
  userInput: string
  planningInput: string
  availableTools: UtilNodeDescriptor[]
  contextInfo?: string
  systemPromptInstruction?: string
  systemPromptConstraint?: string
}): Promise<PlanningOutput> {
  const toolDescriptions = buildToolDescriptionsPrompt(params.availableTools)

  const defaultInstruction = `你是一个任务规划助手。根据用户问题和可用工具，制定工具调用计划。

你的任务：
1. 分析用户问题，理解核心需求
2. 从可用工具中选择合适的工具
3. 为每个工具调用确定合适的参数
4. 如果需要多次调用同一工具（如不同检索词），分别列出`

  const defaultConstraint = `请严格按照以下 JSON 格式输出：

{
  "rationale": "你的推理过程（为什么选择这些工具和参数）",
  "toolCalls": [
    {
      "toolId": "工具ID（从可用工具列表中选择）",
      "params": {
        "参数名": "参数值"
      }
    }
  ]
}

约束：
- toolCalls 数组最多 ${PLANNING_MAX_TOOL_CALLS} 个元素
- toolId 必须来自可用工具列表
- params 必须包含工具所需的参数（参考工具的输入说明）`

  const instruction = params.systemPromptInstruction ?? defaultInstruction
  const constraint = params.systemPromptConstraint ?? defaultConstraint
  const systemPrompt = `${instruction}\n\n${constraint}`

  const userPrompt = `用户原始问题：
${params.userInput}

本轮规划输入（可能是上一轮反馈或补充问题）：
${params.planningInput}

可用工具：
${toolDescriptions}

${params.contextInfo ? `上下文信息：\n${params.contextInfo}\n\n` : ''}请输出工具调用计划（JSON 格式）：`

  const resp = await params.model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ])

  const text =
    typeof (resp as any).content === 'string'
      ? (resp as any).content
      : JSON.stringify((resp as any).content)

  let parsed: any
  try {
    parsed = parseJsonFromModel(text)
  } catch {
    // 容错：解析失败时，如果有工具，用第一个工具 + 用户输入作为回退
    if (params.availableTools.length > 0) {
      return {
        rationale: 'LLM 输出解析失败，使用回退计划',
        toolCalls: [
          {
            toolId: params.availableTools[0].id,
            params: { query: params.planningInput || params.userInput }
          }
        ]
      }
    }
    return {
      rationale: 'LLM 输出解析失败且无可用工具',
      toolCalls: []
    }
  }

  const toolCallsRaw = Array.isArray(parsed?.toolCalls) ? parsed.toolCalls : []
  const toolCalls = toolCallsRaw
    .filter((tc: any) => tc && typeof tc.toolId === 'string' && tc.toolId.trim())
    .slice(0, PLANNING_MAX_TOOL_CALLS)
    .map((tc: any) => ({
      toolId: String(tc.toolId).trim(),
      params: typeof tc.params === 'object' && tc.params !== null ? tc.params : {}
    }))

  return {
    rationale: typeof parsed?.rationale === 'string' ? parsed.rationale : undefined,
    toolCalls: toolCalls.length > 0 ? toolCalls : []
  }
}
