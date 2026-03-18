import { HumanMessage, SystemMessage } from '@langchain/core/messages'

/**
 * analysis-planner
 * 作用：把当前 analysis 文档、用户新输入、历史记忆和工作流规格整理成新的 analysis markdown。
 * 输入：analysis 文档、用户输入、memory window、workflow spec。
 * 输出：markdown、prompt、context，方便 service 做事件转发与持久化。
 * 流程：先拼上下文，再拼提示词，最后调用模型并把结果 trim 成最终 markdown。
 */

export interface AnalysisPlannerContext {
  analysisDocument: string
  userText: string
  memoryWindow: string[]
  workflowSpec: string
}

export interface AnalysisPlannerResult {
  markdown: string
  prompt: string
  context: string
}

type GenerationModelLike = {
  invoke(input: unknown, options?: unknown): Promise<{ content: unknown }>
}

const ANALYSIS_PLANNER_SYSTEM_PROMPT = '你负责把需求整理成 analysis markdown。'

const ANALYSIS_PLANNER_PROMPT_PREFIX = [
  '你是 OrchestraFlow 需求分析规划器。',
  '请输出 markdown，至少包含：摘要、目标、约束、成功标准。',
  '不要输出 verify，不要输出 legacy DSL。'
].join('\n')

function buildContextText(context: AnalysisPlannerContext): string {
  return [
    '当前分析文档：',
    context.analysisDocument,
    '',
    '历史记忆：',
    context.memoryWindow.join('\n'),
    '',
    '用户新输入：',
    context.userText,
    '',
    '工作流基础规格：',
    context.workflowSpec
  ].join('\n')
}

function buildPrompt(contextText: string): string {
  return [ANALYSIS_PLANNER_PROMPT_PREFIX, '', contextText].join('\n')
}

function parseResult(raw: string): string {
  return raw.trim()
}

export async function runAnalysisPlanner(params: {
  model: GenerationModelLike
  context: AnalysisPlannerContext
}): Promise<AnalysisPlannerResult> {
  const contextText = buildContextText(params.context)
  const prompt = buildPrompt(contextText)
  const response = await params.model.invoke([
    new SystemMessage(ANALYSIS_PLANNER_SYSTEM_PROMPT),
    new HumanMessage(prompt)
  ])
  const markdown = parseResult(String(response.content || ''))

  return {
    markdown,
    prompt,
    context: contextText
  }
}
