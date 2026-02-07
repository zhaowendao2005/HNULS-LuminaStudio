/**
 * ======================================================================
 * 规划节点：生成检索计划（Retrieval Plan）
 * ======================================================================
 *
 * 这个节点的目标：
 * - 不执行检索（不请求知识库 API）
 * - 只基于：用户意图 + 当前可用的知识库范围（有哪些文档/表）
 * - 让 LLM 输出一个“检索计划”
 *
 * 检索计划包含：
 * - queries: 一组检索句（最多 10 条，graph 会二次裁剪）
 * - k: 每条检索句的 k 值（必须 <= MAX_K，当前 MAX_K=3）
 *
 * 为什么需要这个节点？
 * - 把“如何检索”这件事显式化（可视化、可回环、可调试）
 * - 让后续的检索节点只负责执行（单一职责）
 * - 让总结节点只负责判断是否足够（单一职责）
 */

import type { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type {
  LangchainClientRetrievalConfig,
  LangchainClientRetrievalPlanOutput
} from '@shared/langchain-client.types'

export const RETRIEVAL_MAX_K = 3
export const RETRIEVAL_MAX_QUERIES = 10

/**
 * 为 LLM 构造一个“可读的可用知识库信息摘要”。
 *
 * 注意：这里不做检索，只告诉模型“你能用哪些范围/文档”。
 */
function formatAvailableKnowledge(retrieval?: LangchainClientRetrievalConfig): string {
  const scopes = retrieval?.scopes ?? []
  if (scopes.length === 0) return '（无可用知识库范围：用户未选择 SourcesTab 范围）'

  return scopes
    .map((s, idx) => {
      const fileKeys = s.fileKeys ?? []
      const fileKeysCount = fileKeys.length

      // 给模型一个“可读的文件列表预览”，帮助它知道目前有哪些文档可用。
      // 注意：如果文件太多，只取前 20 个，避免 prompt 爆炸。
      const previewMax = 20
      const preview = fileKeys.slice(0, previewMax)
      const previewText =
        preview.length > 0
          ? `, fileKeys=[${preview.join(', ')}${fileKeysCount > previewMax ? ', ...' : ''}]`
          : ''

      return `#${idx + 1} knowledgeBaseId=${s.knowledgeBaseId}, tableName=${s.tableName}, fileKeysCount=${fileKeysCount}${previewText}`
    })
    .join('\n')
}

/**
 * 尝试从 LLM 输出中解析 JSON。
 *
 * 兼容情况：
 * - 直接输出纯 JSON
 * - 输出 ```json ... ``` 代码块
 */
function parseJsonFromModel(text: string): any {
  const trimmed = text.trim()

  // 1) 直接 JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed)
  }

  // 2) 代码块 JSON
  const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)
  if (match?.[1]) {
    return JSON.parse(match[1].trim())
  }

  // 3) 尝试截取第一个 { ... }
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
  }

  throw new Error('LLM output is not valid JSON')
}

/**
 * 生成检索计划
 *
 * @param model - 原始 ChatModel（不是 agent）。我们需要它输出结构化 JSON。
 * @param userInput - 用户最初问题（不变）
 * @param planningInput - 规划输入（可能来自总结节点的“补充问题”）
 * @param retrieval - 当前可用的知识库范围（只用作“可用信息提示”）
 */
export async function runRetrievalPlanning(params: {
  model: ChatOpenAI
  userInput: string
  planningInput: string
  retrieval?: LangchainClientRetrievalConfig
  maxK?: number
}): Promise<LangchainClientRetrievalPlanOutput> {
  const maxK = Math.min(RETRIEVAL_MAX_K, Math.max(1, params.maxK ?? RETRIEVAL_MAX_K))

  const systemPrompt = `你是一个“知识库检索规划助手”。
你不会直接回答用户问题；你的任务是生成检索计划。

你已知：可用知识库范围列表（哪些 table、哪些文件）。你不需要也不允许真正检索。

请输出一个 JSON 对象，不要输出任何多余文本，格式如下：
{
  "maxK": number,
  "rationale": string,
  "queries": [
    { "query": string, "k": number }
  ]
}

要求：
- queries 最多 ${RETRIEVAL_MAX_QUERIES} 条；如果只需要 1-3 条也可以。
- 每个 k 必须是 1..maxK 的整数。
- query 要具体，能最大化命中用户需要的信息。
- maxK 固定输出为 ${maxK}。
`

  const available = formatAvailableKnowledge(params.retrieval)

  const userPrompt = `用户原始问题：
${params.userInput}

本轮规划输入（可能是补充澄清点）：
${params.planningInput}

可用知识库范围（仅供你规划，不要检索）：
${available}
`

  const resp = await params.model.invoke([new SystemMessage(systemPrompt), new HumanMessage(userPrompt)])
  const text = typeof (resp as any).content === 'string' ? (resp as any).content : JSON.stringify((resp as any).content)

  let parsed: any
  try {
    parsed = parseJsonFromModel(text)
  } catch {
    // 容错：如果模型输出不合规，至少给一个最小可用计划
    return {
      maxK,
      rationale: 'LLM 输出解析失败，回退为默认计划（使用用户输入作为检索句）',
      queries: [{ query: params.planningInput || params.userInput, k: maxK }]
    }
  }

  const queriesRaw = Array.isArray(parsed?.queries) ? parsed.queries : []
  const queries = queriesRaw
    .map((q: any) => ({
      query: String(q?.query ?? '').trim(),
      k: Number.isFinite(q?.k) ? Math.floor(q.k) : maxK
    }))
    .filter((q: any) => q.query)
    .slice(0, RETRIEVAL_MAX_QUERIES)
    .map((q: any) => ({
      query: q.query,
      k: Math.min(maxK, Math.max(1, q.k))
    }))

  return {
    maxK,
    rationale: typeof parsed?.rationale === 'string' ? parsed.rationale : undefined,
    queries: queries.length > 0 ? queries : [{ query: params.planningInput || params.userInput, k: maxK }]
  }
}
