import { HumanMessage, SystemMessage } from '@langchain/core/messages'

/**
 * analysis-planner
 * 作用：作为需求规划阶段唯一主入口，同时承接聊天支路与结果支路。
 * 输入：analysis 文档、用户输入、历史记忆、工作流规格，以及当前希望走的分支模式。
 * 输出：统一返回 branch、prompt、context；当 branch=chat 时返回讨论 reply 与意图判断；当 branch=result 时返回正式规划 markdown。
 * 流程：先拼公共上下文，再根据 mode 选择 chat / result 提示词，最后在同一个 agent 内部用 if 分支解析不同结果。
 */

export interface AnalysisPlannerContext {
  analysisDocument: string
  userText: string
  memoryWindow: string[]
  workflowSpec: string
}

export interface AnalysisPlannerIntent {
  finalizeAnalysis: boolean
  confidence: 'low' | 'medium' | 'high'
  reason: string
}

export type AnalysisPlannerMode = 'chat' | 'result'

export type AnalysisPlannerResult =
  | {
      branch: 'chat'
      reply: string
      intent: AnalysisPlannerIntent
      prompt: string
      context: string
      outputKind: 'analysis-chat'
    }
  | {
      branch: 'result'
      markdown: string
      prompt: string
      context: string
      outputKind: 'analysis-result'
    }

type GenerationModelLike = {
  invoke(input: unknown, options?: unknown): Promise<{ content: unknown }>
}

const ANALYSIS_PLANNER_SYSTEM_PROMPT = [
  '你是 OrchestraFlow 需求分析规划器。',
  '你同时负责两个分支：',
  '1. chat：继续和用户讨论方案，并判断用户是否已经明确要求定稿。',
  '2. result：输出正式 analysis markdown。'
].join('\n')

const ANALYSIS_CHAT_PROMPT_PREFIX = [
  '当前模式：chat。',
  '请继续和用户讨论方案，不要直接输出正式规划 markdown。',
  '你必须只输出 JSON，不要输出 markdown 代码块，不要输出额外解释。',
  'JSON 格式必须严格为：',
  '{',
  '  "reply": "给用户的讨论回复",',
  '  "intent": {',
  '    "finalizeAnalysis": true 或 false,',
  '    "confidence": "low" | "medium" | "high",',
  '    "reason": "一句简短判断理由"',
  '  }',
  '}',
  '若用户只是继续讨论、补充、追问、比较方案，则 finalizeAnalysis 必须为 false。',
  '只有当用户明确表达“按这个定稿 / 整理成正式规划 / 直接输出计划”时，finalizeAnalysis 才能为 true。'
].join('\n')

const ANALYSIS_RESULT_PROMPT_PREFIX = [
  '当前模式：result。',
  '请输出正式 analysis markdown，至少包含：摘要、目标、约束、成功标准。',
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

function buildPrompt(mode: AnalysisPlannerMode, contextText: string): string {
  return [
    mode === 'chat' ? ANALYSIS_CHAT_PROMPT_PREFIX : ANALYSIS_RESULT_PROMPT_PREFIX,
    '',
    contextText
  ].join('\n')
}

function parseChatResult(raw: string): { reply: string; intent: AnalysisPlannerIntent } {
  const parsed = JSON.parse(raw.trim()) as {
    reply?: unknown
    intent?: {
      finalizeAnalysis?: unknown
      confidence?: unknown
      reason?: unknown
    }
  }

  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : ''
  if (!reply) {
    throw new Error('analysis-planner(chat) 未返回有效 reply')
  }

  const confidence = parsed.intent?.confidence
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    throw new Error('analysis-planner(chat) 未返回合法 confidence')
  }

  const reason = typeof parsed.intent?.reason === 'string' ? parsed.intent.reason.trim() : ''
  if (!reason) {
    throw new Error('analysis-planner(chat) 未返回有效 reason')
  }

  return {
    reply,
    intent: {
      finalizeAnalysis: Boolean(parsed.intent?.finalizeAnalysis),
      confidence,
      reason
    }
  }
}

function parseResultMarkdown(raw: string): string {
  return raw.trim()
}

export async function runAnalysisPlanner(params: {
  model: GenerationModelLike
  context: AnalysisPlannerContext
  mode: AnalysisPlannerMode
}): Promise<AnalysisPlannerResult> {
  const contextText = buildContextText(params.context)
  const prompt = buildPrompt(params.mode, contextText)
  const response = await params.model.invoke([
    new SystemMessage(ANALYSIS_PLANNER_SYSTEM_PROMPT),
    new HumanMessage(prompt)
  ])
  const rawText = String(response.content || '')

  if (params.mode === 'chat') {
    const parsed = parseChatResult(rawText)
    return {
      branch: 'chat',
      reply: parsed.reply,
      intent: parsed.intent,
      prompt,
      context: contextText,
      outputKind: 'analysis-chat'
    }
  }

  return {
    branch: 'result',
    markdown: parseResultMarkdown(rawText),
    prompt,
    context: contextText,
    outputKind: 'analysis-result'
  }
}
