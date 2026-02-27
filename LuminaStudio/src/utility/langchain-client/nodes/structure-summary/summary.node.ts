/**
 * ======================================================================
 * 总结与判断节点 (Structure Node) - 通用证据总结器
 * ======================================================================
 *
 * 职责：
 * - 汇总所有工具执行结果（不关心来自哪个工具）
 * - 使用 LLM 判断"证据是否足够回答用户问题"
 * - 输出决策：是否需要回环继续检索
 *
 * 与旧版区别：
 * - 旧版：硬编码消费 RetrievalExecutionResult[]，只能处理 knowledge_retrieval
 * - 新版：消费通用 ToolExecutionResult[]，可处理任意工具组合
 */

import type { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { ToolExecutionResult } from '../types'
import { SUMMARY_NODE_INSTRUCTION, getSummaryNodeConstraint } from '@prompt/summary.node.prompt'

/**
 * 总结输出（通用格式）
 */
export interface SummaryOutput {
  /** 是否需要回环继续检索 */
  shouldLoop: boolean
  /**
   * 消息内容：
   * - shouldLoop=false: 最终答案（给用户）
   * - shouldLoop=true: 缺口说明（给规划节点作为下一轮输入）
   */
  message: string
}

/**
 * 尝试从 LLM 输出中解析 JSON
 */
function parseJsonFromModel(text: string): any {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed)
  }

  const fence = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim())
  }

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1))
  }

  throw new Error('LLM output is not valid JSON')
}

/**
 * 构建证据摘要（压缩版，避免上下文爆炸）
 */
function buildEvidenceDigest(results: ToolExecutionResult[]): string {
  if (results.length === 0) return '（无工具执行结果）'

  const parts: string[] = []

  for (const [idx, r] of results.entries()) {
    parts.push(`\n===== 节点执行 #${idx + 1} =====`)
    parts.push(`nodeId: ${r.nodeId}`)
    parts.push(`params: ${JSON.stringify(r.params)}`)

    // 尝试解析结果 JSON 并压缩
    let parsed: any
    try {
      parsed = JSON.parse(r.resultText)
    } catch {
      // 解析失败，保留前 2000 字符
      const preview = r.resultText.slice(0, 2000)
      parts.push(`rawPreview(前2000字): ${preview}`)
      continue
    }

    // 通用处理：提取结构化信息
    if (parsed.items && Array.isArray(parsed.items)) {
      // PubMed / 列表型结果
      parts.push(`totalItems: ${parsed.items.length}`)
      parsed.items.slice(0, 5).forEach((item: any, i: number) => {
        const title = item.title || item.name || '无标题'
        const snippet = typeof item.abstract === 'string' ? item.abstract.slice(0, 200) : ''
        parts.push(`  • item#${i + 1}: ${title}`)
        if (snippet) parts.push(`    摘要: ${snippet}...`)
      })
    } else if (parsed.scopes && Array.isArray(parsed.scopes)) {
      // Knowledge retrieval 结果
      parts.push(`totalScopes: ${parsed.scopes.length}`)
      parsed.scopes.forEach((scope: any) => {
        const hits = Array.isArray(scope.hits) ? scope.hits : []
        parts.push(`  - scope: ${scope.tableName || 'unknown'}, hits=${hits.length}`)
        hits.slice(0, 3).forEach((hit: any, i: number) => {
          const content = typeof hit.content === 'string' ? hit.content : ''
          const snippet = content.slice(0, 200)
          parts.push(`    • hit#${i + 1}: ${snippet}...`)
        })
      })
    } else {
      // 其他类型结果：取前 1000 字符
      parts.push(`result: ${JSON.stringify(parsed).slice(0, 1000)}`)
    }
  }

  return parts.join('\n')
}

/**
 * 运行总结与判断
 */
export async function runSummary(params: {
  model: ChatOpenAI
  userInput: string
  planningInput: string
  iteration: number
  results: ToolExecutionResult[]
  maxIterations?: number
  systemPromptInstruction?: string
  systemPromptConstraint?: string
  contextInfo?: string
}): Promise<SummaryOutput> {
  const evidence = buildEvidenceDigest(params.results)

  const maxIterations = Math.max(1, Math.floor(params.maxIterations ?? 3))

  const instruction = params.systemPromptInstruction ?? SUMMARY_NODE_INSTRUCTION
  const constraint = params.systemPromptConstraint ?? getSummaryNodeConstraint(maxIterations)
  const systemPrompt = `${instruction}\n\n${constraint}`

  const userPrompt = `用户原始问题：
${params.userInput}

本轮规划输入：
${params.planningInput}

当前迭代轮次：${params.iteration} (最大 ${maxIterations - 1})

工具执行结果摘要：
${evidence}

${params.contextInfo ? `上下文信息：\n${params.contextInfo}\n\n` : ''}请输出判断结果（JSON 格式）：`

  const resp = await params.model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ])

  const text =
    typeof (resp as any).content === 'string'
      ? (resp as any).content
      : JSON.stringify((resp as any).content)

  try {
    const parsed = parseJsonFromModel(text)
    const shouldLoop = Boolean(parsed?.shouldLoop)
    const message = String(parsed?.message ?? '').trim()

    if (!message) {
      return {
        shouldLoop: true,
        message: '总结结果为空，请进一步明确需要的信息。'
      }
    }

    return { shouldLoop, message }
  } catch {
    // 容错：解析失败
    return {
      shouldLoop: false,
      message: '总结节点输出解析失败，无法可靠生成答案。'
    }
  }
}
