/**
 * ======================================================================
 * 总结与判断节点：汇总检索结果，并判断是否需要回环
 * ======================================================================
 *
 * 这个节点的目标：
 * - 输入：用户问题 + 多次检索结果（可能来自不同检索句）
 * - 使用 LLM 进行“证据总结”与“是否足够回答”的判断
 * - 输出：一个 JSON
 *   - shouldLoop: boolean
 *   - message: string
 *     - shouldLoop=false: 最终答案（给用户）
 *     - shouldLoop=true: 下一轮规划要解决的缺口/方向（给规划节点当输入）
 *
 * 注意：
 * - 本节点不负责执行检索（由检索节点负责）
 * - 本节点不负责规划检索句（由规划节点负责）
 * - 本节点只做：总结 + 判断（单一职责）
 */

import type { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { LangchainClientSummaryDecisionOutput } from '@shared/langchain-client.types'
import {
  DEFAULT_SUMMARY_INSTRUCTION,
  getDefaultSummaryConstraint
} from '@shared/knowledge-qa-default-prompts'

/**
 * 检索结果在 graph 内部的标准形态。
 * - query/k: 本次检索的查询句和 k
 * - resultText: runKnowledgeRetrieval 返回的 JSON 字符串
 */
export interface RetrievalExecutionResult {
  query: string
  k: number
  resultText: string
}

/**
 * 尝试从模型输出中解析 JSON。
 * 兼容：纯 JSON / ```json``` code fence / 混杂文本。
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
 * 将检索结果压缩为“可读证据摘要”，以避免上下文爆炸。
 *
 * 重要：
 * - 我们不修改检索节点的原始返回（它仍可包含完整 content）。
 * - 这里只是“喂给总结 LLM 的输入摘要”。
 * - 这样做是工程上的必要性：避免一次塞入太多 HTML 导致模型调用失败。
 */
function buildEvidenceDigest(results: RetrievalExecutionResult[]): string {
  if (results.length === 0) return '（没有检索结果）'

  const parts: string[] = []

  for (const [idx, r] of results.entries()) {
    parts.push(`\n===== 检索 #${idx + 1} =====`)
    parts.push(`query: ${r.query}`)
    parts.push(`k: ${r.k}`)

    // 尝试解析 JSON，以提取更结构化的信息。
    let parsed: any
    try {
      parsed = JSON.parse(r.resultText)
    } catch {
      // 如果解析失败，保留少量原文，避免把整段大文本塞进去
      const preview = r.resultText.slice(0, 2000)
      parts.push(`rawPreview(前2000字): ${preview}`)
      continue
    }

    const scopes = Array.isArray(parsed?.scopes) ? parsed.scopes : []
    parts.push(`totalScopes: ${Number(parsed?.totalScopes ?? scopes.length)}`)

    for (const s of scopes) {
      const tableName = String(s?.tableName ?? '')
      const fileKeysCount = Number(s?.fileKeysCount ?? 0)
      const hits = Array.isArray(s?.hits) ? s.hits : []
      parts.push(
        `- scope: tableName=${tableName}, fileKeysCount=${fileKeysCount}, hits=${hits.length}`
      )

      // 每个 hit 仅取前 1 段 snippet，避免全文 HTML 直接灌进模型
      for (const [hitIdx, hit] of hits.entries()) {
        const fileName = hit?.file_name ? String(hit.file_name) : ''
        const chunkIndex = hit?.chunk_index
        const distance = hit?.distance
        const rerank = hit?.rerank_score
        const content = typeof hit?.content === 'string' ? hit.content : ''
        const snippet = content.length > 400 ? content.slice(0, 400) + '...' : content

        parts.push(
          `  • hit#${hitIdx + 1}: file=${fileName || 'unknown'}, chunk=${chunkIndex ?? 'n/a'}, dist=${
            typeof distance === 'number' ? distance.toFixed(4) : 'n/a'
          }, rerank=${typeof rerank === 'number' ? rerank.toFixed(4) : 'n/a'}`
        )
        parts.push(`    snippet: ${snippet}`)
      }

      if (typeof s?.error === 'string' && s.error) {
        parts.push(`  ⚠ scopeError: ${s.error}`)
      }
    }
  }

  return parts.join('\n')
}

/**
 * 运行总结与判断
 */
export async function runSummaryDecision(params: {
  model: ChatOpenAI
  userInput: string
  planningInput: string
  iteration: number
  results: RetrievalExecutionResult[]
  maxIterations?: number
  systemPromptInstruction?: string
  systemPromptConstraint?: string
}): Promise<LangchainClientSummaryDecisionOutput> {
  const evidence = buildEvidenceDigest(params.results)

  // 组合两部分 prompt：指令 + 约束
  const instruction = params.systemPromptInstruction ?? DEFAULT_SUMMARY_INSTRUCTION
  const maxIterations = Math.max(1, Math.floor(params.maxIterations ?? 3))
  const constraint = params.systemPromptConstraint ?? getDefaultSummaryConstraint(maxIterations)
  const systemPrompt = `${instruction}

${constraint}`

  const userPrompt = `用户原始问题：
${params.userInput}

本轮规划输入（用于引导检索）：
${params.planningInput}

当前迭代轮次（从 0 开始）：${params.iteration}

检索证据摘要：
${evidence}
`

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
      // 容错：message 为空时，给一个可用默认值
      return {
        shouldLoop: true,
        message: '总结结果为空：请进一步明确需要检索的知识点，并给出更具体的检索关键词。'
      }
    }

    return { shouldLoop, message }
  } catch {
    // 容错：解析失败时，不要让整个请求崩溃
    return {
      shouldLoop: false,
      message: '总结节点输出解析失败，无法可靠生成最终答案。建议重试或缩小问题范围。'
    }
  }
}
