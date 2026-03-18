import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { GenerationValidationReport } from '@preload/types'
import { validateOFAuthoringToml } from '@shared/Orchestraflow-types'
import { mapAuthoringDiagnostics } from '../../validation/diagnostics'
import { runFormatValidation } from '../../validation/format-validator'

/**
 * design-planner
 * 作用：根据 analysis 文档、当前 TOML 和上轮校验信息，生成可通过校验的 OrchestraFlow 设计稿。
 * 输入：analysis 文档、当前 TOML、workflow spec、node prompt、上一轮校验报告。
 * 输出：最终 toml、最终 validationReport、迭代次数，以及最后一轮 prompt/context。
 * 流程：agent 内部负责完整 repair loop；每轮都负责组装上下文、调用模型、执行格式校验和 authoring 校验，
 * 如果失败就把失败结果带入下一轮继续修复，如果成功就提前结束。
 */

export interface DesignPlannerContext {
  analysisDocument: string
  currentToml: string
  workflowSpec: string
  nodePrompt: string
  validationReport?: GenerationValidationReport | null
}

export interface DesignPlannerIterationSnapshot {
  iteration: number
  prompt: string
  context: string
  toml: string
  validationReport: GenerationValidationReport
}

export interface DesignPlannerResult {
  toml: string
  validationReport: GenerationValidationReport
  iterationsUsed: number
  lastPrompt: string
  lastContext: string
}

type GenerationModelLike = {
  invoke(input: unknown, options?: unknown): Promise<{ content: unknown }>
}

const DESIGN_PLANNER_SYSTEM_PROMPT = '你负责输出可编译的 OrchestraFlow TOML。'

const DESIGN_PLANNER_PROMPT_PREFIX = [
  '你是 OrchestraFlow 设计规划器。',
  '请直接输出标准 TOML。',
  '不要输出 legacy DSL，不要输出 verify，不要输出额外解释。'
].join('\n')

function buildContextText(context: DesignPlannerContext): string {
  return [
    'analysis 文档：',
    context.analysisDocument,
    '',
    '当前工作 TOML：',
    context.currentToml,
    '',
    '工作流基础规格：',
    context.workflowSpec,
    '',
    '节点提示压缩：',
    context.nodePrompt,
    '',
    '上轮校验：',
    context.validationReport ? JSON.stringify(context.validationReport, null, 2) : '无'
  ].join('\n')
}

function buildPrompt(contextText: string): string {
  return [DESIGN_PLANNER_PROMPT_PREFIX, '', contextText].join('\n')
}

function parseResult(raw: string): string {
  return raw.trim()
}

function buildValidationReport(toml: string): GenerationValidationReport {
  const parsed = runFormatValidation(toml)
  if (!parsed.document) {
    return {
      valid: false,
      diagnostics: mapAuthoringDiagnostics(parsed.diagnostics)
    }
  }

  const validation = validateOFAuthoringToml(parsed.document)
  return {
    valid: validation.valid,
    diagnostics: mapAuthoringDiagnostics(validation.diagnostics)
  }
}

export async function runDesignPlanner(params: {
  model: GenerationModelLike
  context: DesignPlannerContext
  maxRepairIterations: number
  onIteration?: (snapshot: DesignPlannerIterationSnapshot) => void | Promise<void>
}): Promise<DesignPlannerResult> {
  let currentToml = params.context.currentToml
  let currentValidation = params.context.validationReport ?? null
  let lastPrompt = ''
  let lastContext = ''
  let lastToml = currentToml
  let lastValidation: GenerationValidationReport = currentValidation ?? {
    valid: false,
    diagnostics: []
  }

  for (let iteration = 1; iteration <= params.maxRepairIterations; iteration += 1) {
    const iterationContext: DesignPlannerContext = {
      ...params.context,
      currentToml,
      validationReport: currentValidation
    }
    const contextText = buildContextText(iterationContext)
    const prompt = buildPrompt(contextText)
    const response = await params.model.invoke([
      new SystemMessage(DESIGN_PLANNER_SYSTEM_PROMPT),
      new HumanMessage(prompt)
    ])
    const toml = parseResult(String(response.content || ''))
    const validationReport = buildValidationReport(toml)

    lastPrompt = prompt
    lastContext = contextText
    lastToml = toml
    lastValidation = validationReport

    await params.onIteration?.({
      iteration,
      prompt,
      context: contextText,
      toml,
      validationReport
    })

    if (validationReport.valid) {
      return {
        toml,
        validationReport,
        iterationsUsed: iteration,
        lastPrompt,
        lastContext
      }
    }

    currentToml = toml
    currentValidation = validationReport
  }

  return {
    toml: lastToml,
    validationReport: lastValidation,
    iterationsUsed: params.maxRepairIterations,
    lastPrompt,
    lastContext
  }
}
