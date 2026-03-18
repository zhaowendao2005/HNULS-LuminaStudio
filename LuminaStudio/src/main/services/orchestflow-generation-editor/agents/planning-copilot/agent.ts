import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { parseOFPlanningPatchToml } from '@shared/Orchestraflow-types'

/**
 * planning-copilot
 * 作用：根据当前 analysis 文档和用户补充意图，产出可直接应用的 analysis TOML patch。
 * 输入：analysis 文档、用户意图、memory window。
 * 输出：patchToml、prompt、context，方便 service 做快照事件与后续 patch 应用。
 * 流程：先组装上下文和提示词，再调用模型，最后用共享解析器校验 patch 结构是否合法。
 */

export interface PlanningCopilotContext {
  analysisDocument: string
  userText: string
  memoryWindow: string[]
}

export interface PlanningCopilotResult {
  patchToml: string
  prompt: string
  context: string
}

type GenerationModelLike = {
  invoke(input: unknown, options?: unknown): Promise<{ content: unknown }>
}

const PLANNING_COPILOT_SYSTEM_PROMPT = '你负责给 analysis 文档产出 TOML patch。'

const PLANNING_COPILOT_PROMPT_PREFIX = [
  '你是 analysis 文档编辑 copilot。',
  '请输出 TOML patch，只允许 action 和 content 两个字段。',
  'action 只能是 replace-analysis 或 append-analysis。'
].join('\n')

function buildContextText(context: PlanningCopilotContext): string {
  return [
    '当前分析文档：',
    context.analysisDocument,
    '',
    '历史记忆：',
    context.memoryWindow.join('\n'),
    '',
    '用户意图：',
    context.userText
  ].join('\n')
}

function buildPrompt(contextText: string): string {
  return [PLANNING_COPILOT_PROMPT_PREFIX, '', contextText].join('\n')
}

function parseResult(raw: string): string {
  const patchToml = raw.trim()
  parseOFPlanningPatchToml(patchToml)
  return patchToml
}

export async function runPlanningCopilot(params: {
  model: GenerationModelLike
  context: PlanningCopilotContext
}): Promise<PlanningCopilotResult> {
  const contextText = buildContextText(params.context)
  const prompt = buildPrompt(contextText)
  const response = await params.model.invoke([
    new SystemMessage(PLANNING_COPILOT_SYSTEM_PROMPT),
    new HumanMessage(prompt)
  ])
  const patchToml = parseResult(String(response.content || ''))

  return {
    patchToml,
    prompt,
    context: contextText
  }
}
