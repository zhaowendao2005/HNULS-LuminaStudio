import {
  OF_BLUEPRINT_SECTION_DSL_HEADER,
  buildOFPlanningMarkdown,
  getOFPlanningRootTitle,
  getOFPlanningSectionDefinition,
  getOFPlanningSectionKeysByRoot,
  parseOFPlanningMarkdown,
  type OFBlueprintTextDiagnostic,
  type OFPlanningDocument,
  type OFPlanningRootKey,
  type OFPlanningSectionKey
} from '@shared/Orchestraflow-types'
import type { GenerationDesignDocument } from '@preload/types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import { buildDeclaredNodeSpecsPrompt } from '../../prompt-sources/declared-node-spec.source'
import { buildDslSyntaxPrompt } from '../../prompt-sources/dsl-syntax.source'
import { buildMechanismRulesPrompt } from '../../prompt-sources/mechanism-rules.source'
import { buildDeclaredNodesPrompt } from '../../prompt-sources/node-selection.source'
import type { DesignBlueprintContextBundle } from './types'

const DSL_ASSIGNMENT_KEYS = new Set([
  'name',
  'description',
  'author',
  'type',
  'title',
  'prompt',
  'model',
  'struct',
  'inputs',
  'vars',
  'let',
  'outputs',
  'edges',
  'when',
  'else_label',
  'count',
  'over',
  'result',
  'entry'
])

const PROMPT_POLLUTION_LINE_PATTERNS = [
  /^design_document_id=/i,
  /^generation_mode=/i,
  /^#\d+\s+\[(?:user|assistant|system)\]$/i,
  /^status:\s*(?:streaming|completed|final|error|aborted|invalid)$/i,
  /^##\s+(?:节点声明|声明节点 Spec|系统底层机制规则|DSL 语法与格式)$/i,
  /^##\s+(?:当前版本已有 DSL 正文|当前版本状态摘要|当前版本 design copilot 最近对话|当前用户输入)$/i,
  /^你是 LuminaStudio 的规划设计 DSL 蓝图生成 Agent。$/,
  /^你的唯一目标：/,
  /^硬性规则：$/,
  /^输出优先级：$/
]

export function buildDesignBlueprintContextBundle(params: {
  repository: GenerationEditorRepository
  designDocumentId: string
}): DesignBlueprintContextBundle {
  // 这里组装的是“给 LLM 看的作者态上下文”，职责是帮助模型产出合法 OFT/1 DSL。
  // 它不应该直接等价于运行态/持久化态的内部结构；
  // 后者是固定契约，前者则需要跟随 DSL + parser/compiler 的演进持续调优。
  const designDocument = params.repository.getDesignDocumentById(params.designDocumentId)
  const normalizedPlanningDocument = normalizePlanningSnapshotDocument(
    designDocument.sourceSnapshotMarkdown
  )
  const normalizedPlanningMarkdown = buildOFPlanningMarkdown(normalizedPlanningDocument)

  return {
    planningSnapshotSummaryText: buildPlanningSnapshotSummary(normalizedPlanningDocument),
    designDocumentStateSummaryText: buildDesignDocumentStateSummary(designDocument),
    canonicalPromptSourceText: [
      buildDeclaredNodesPrompt(normalizedPlanningMarkdown),
      buildDeclaredNodeSpecsPrompt(normalizedPlanningMarkdown),
      buildMechanismRulesPrompt(),
      buildDslSyntaxPrompt()
    ].join('\n\n')
  }
}

function normalizePlanningSnapshotDocument(sourceMarkdown: string): OFPlanningDocument {
  const parsed = parseOFPlanningMarkdown(sourceMarkdown || '')
  const sections = Object.fromEntries(
    listPlanningSectionKeys().map((sectionKey) => [
      sectionKey,
      sanitizePlanningSectionContent(parsed.document.sections[sectionKey] || '')
    ])
  ) as Record<OFPlanningSectionKey, string>

  return { sections }
}

function listPlanningSectionKeys(): OFPlanningSectionKey[] {
  return [
    ...getOFPlanningSectionKeysByRoot('analysis'),
    ...getOFPlanningSectionKeysByRoot('design')
  ]
}

function buildPlanningSnapshotSummary(document: OFPlanningDocument): string {
  const roots: OFPlanningRootKey[] = ['analysis', 'design']
  const lines = ['已按 canonical planning sections 清洗，只保留当前需求事实。']

  roots.forEach((rootKey) => {
    const sectionLines = getOFPlanningSectionKeysByRoot(rootKey).flatMap((sectionKey) => {
      const content = document.sections[sectionKey]?.trim() || ''
      if (!content) {
        return []
      }

      const definition = getOFPlanningSectionDefinition(sectionKey)
      return [`## ${definition.title}`, content]
    })

    if (sectionLines.length) {
      lines.push('', `# ${getOFPlanningRootTitle(rootKey)}`, ...sectionLines)
    }
  })

  return lines.length > 1 ? lines.join('\n').trim() : '暂无可用的需求规划快照摘要。'
}

function sanitizePlanningSectionContent(content: string): string {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const sanitizedLines: string[] = []
  const seenContentLines = new Set<string>()

  // 这里专门过滤“历史 prompt / 历史 DSL 回流”，避免把旧上下文重新喂给蓝图生成 Agent。
  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (shouldDropPlanningLine(trimmed)) {
      continue
    }

    if (!trimmed) {
      if (sanitizedLines[sanitizedLines.length - 1] !== '') {
        sanitizedLines.push('')
      }
      continue
    }

    const dedupeKey = trimmed.toLowerCase()
    if (seenContentLines.has(dedupeKey)) {
      continue
    }

    seenContentLines.add(dedupeKey)
    sanitizedLines.push(trimmed)
  }

  return sanitizedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function shouldDropPlanningLine(trimmedLine: string): boolean {
  if (!trimmedLine) {
    return false
  }

  const contentLine = trimmedLine.replace(/^[-*]\s+/, '').trim()
  const unquotedContentLine = contentLine.replace(/^["'`]|["'`]$/g, '')

  if (
    PROMPT_POLLUTION_LINE_PATTERNS.some(
      (pattern) => pattern.test(trimmedLine) || pattern.test(contentLine)
    )
  ) {
    return true
  }

  if (contentLine === OF_BLUEPRINT_SECTION_DSL_HEADER) {
    return true
  }

  if (/^\[[A-Za-z0-9_.-]+\]$/.test(contentLine)) {
    return true
  }

  if (looksLikeDslAssignment(contentLine)) {
    return true
  }

  return looksLikeBlueprintEdge(unquotedContentLine)
}

function looksLikeDslAssignment(contentLine: string): boolean {
  const assignmentMatch = contentLine.match(/^([A-Za-z0-9_.-]+)\s*=/)
  if (!assignmentMatch) {
    return false
  }

  return DSL_ASSIGNMENT_KEYS.has(assignmentMatch[1])
}

function looksLikeBlueprintEdge(contentLine: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\s*->\s*[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(contentLine)
}

function buildDesignDocumentStateSummary(designDocument: GenerationDesignDocument): string {
  const diagnostics = summarizeDiagnostics(designDocument.diagnosticsJson)

  return [
    `- hasContent: ${designDocument.content.trim() ? 'yes' : 'no'}`,
    `- status: ${designDocument.status}`,
    `- contentFormat: ${designDocument.contentFormat || '(unknown)'}`,
    `- lastCompilePassed: ${resolveLastCompilePassed(designDocument)}`,
    `- summary: ${normalizeSummaryLine(designDocument.summary)}`,
    `- derivedTargetStatus: ${designDocument.derivedStatus || '(none)'}`,
    ...diagnostics.map((diagnostic, index) => `- diagnostic ${index + 1}: ${diagnostic}`)
  ].join('\n')
}

function resolveLastCompilePassed(designDocument: GenerationDesignDocument): string {
  if (!designDocument.content.trim()) {
    return 'not-run'
  }
  if (designDocument.status === 'valid') {
    return 'yes'
  }
  if (designDocument.status === 'invalid') {
    return 'no'
  }
  return 'unknown'
}

function normalizeSummaryLine(summary: string): string {
  const normalized = summary.replace(/\s+/g, ' ').trim()
  return normalized || '(empty)'
}

function summarizeDiagnostics(diagnosticsJson: string | null): string[] {
  if (!diagnosticsJson) {
    return []
  }

  try {
    const diagnostics = JSON.parse(diagnosticsJson) as OFBlueprintTextDiagnostic[]
    return diagnostics.slice(0, 3).map((diagnostic) => {
      const location =
        diagnostic.line !== undefined && diagnostic.column !== undefined
          ? ` @ ${diagnostic.line}:${diagnostic.column}`
          : ''
      return `${diagnostic.code}${location} - ${diagnostic.message}`
    })
  } catch {
    return ['diagnostics_json 解析失败']
  }
}
