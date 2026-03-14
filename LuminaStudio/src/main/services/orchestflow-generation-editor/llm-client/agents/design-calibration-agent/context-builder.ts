import {
  buildOFBlueprintDiagnosticSignature,
  parseOFPlanningMarkdown,
  type OFBlueprintTextDiagnostic
} from '@shared/Orchestraflow-types'
import type { GenerationDesignDocument } from '@preload/types'
import { buildDeclaredNodeSpecsPrompt } from '../../prompt-sources/declared-node-spec.source'
import { buildDslSyntaxPrompt } from '../../prompt-sources/dsl-syntax.source'
import { buildMechanismRulesPrompt } from '../../prompt-sources/mechanism-rules.source'
import type { DesignCalibrationPassContextBundle } from './types'

const MAX_TARGET_DIAGNOSTICS = 8

export function buildDesignCalibrationPassContextBundle(params: {
  designDocument: GenerationDesignDocument
  workingDsl: string
  diagnostics: OFBlueprintTextDiagnostic[]
  contextBudgetChars: number
}): DesignCalibrationPassContextBundle {
  const targetDiagnostics = selectTargetDiagnostics(params.diagnostics)
  const sourceSnapshotText = buildPlanningSnapshotExcerpt(
    params.designDocument.sourceSnapshotMarkdown
  )
  const relevantSections = buildRelevantDslSections(params.workingDsl, targetDiagnostics)

  const promptSourceText = clipText(
    [
      buildMechanismRulesPrompt(),
      '',
      buildDslSyntaxPrompt(),
      '',
      buildDeclaredNodeSpecsPrompt(params.designDocument.sourceSnapshotMarkdown)
    ].join('\n'),
    Math.floor(params.contextBudgetChars * 0.28)
  )

  const diagnosticsSummaryText = clipText(
    buildDiagnosticsSummary(params.diagnostics),
    Math.floor(params.contextBudgetChars * 0.18)
  )
  const targetDiagnosticsText = clipText(
    buildTargetDiagnosticsText(targetDiagnostics),
    Math.floor(params.contextBudgetChars * 0.18)
  )
  const planningSnapshotText = clipText(
    sourceSnapshotText,
    Math.floor(params.contextBudgetChars * 0.18)
  )

  const reservedChars =
    diagnosticsSummaryText.length +
    targetDiagnosticsText.length +
    planningSnapshotText.length +
    promptSourceText.length
  const dslBudget = Math.max(4000, params.contextBudgetChars - reservedChars - 1200)

  // 如果全文放得下就优先给全文，放不下才退回到“命中 section + 邻近 section”的摘录。
  const dslContextText = clipText(
    params.workingDsl.length <= dslBudget ? params.workingDsl : relevantSections,
    dslBudget
  )

  return {
    planningSnapshotText,
    diagnosticsSummaryText,
    targetDiagnosticsText,
    dslContextText,
    promptSourceText,
    targetDiagnostics
  }
}

function selectTargetDiagnostics(
  diagnostics: OFBlueprintTextDiagnostic[]
): OFBlueprintTextDiagnostic[] {
  const sorted = [...diagnostics].sort((left, right) => {
    if (left.line !== right.line) return left.line - right.line
    return left.column - right.column
  })
  const anchor = sorted[0]
  if (!anchor) {
    return []
  }

  const anchorSectionKey = `${anchor.path.split('.')[0] || 'workflow'}:${anchor.line}`
  const sameBucket = sorted.filter((diagnostic) => {
    const currentKey = `${diagnostic.path.split('.')[0] || 'workflow'}:${diagnostic.line}`
    return currentKey === anchorSectionKey || diagnostic.code === anchor.code
  })

  return sameBucket.slice(0, MAX_TARGET_DIAGNOSTICS)
}

function buildPlanningSnapshotExcerpt(sourceMarkdown: string): string {
  const parsed = parseOFPlanningMarkdown(sourceMarkdown || '')
  const sections = parsed.document.sections

  return [
    '# 设计快照摘要',
    '## 节点声明',
    sections['design-candidate-nodes'] || '- 暂无',
    '## 输入要求',
    sections['design-input-requirements'] || '- 暂无',
    '## 输出要求',
    sections['design-output-requirements'] || '- 暂无',
    '## 蓝图要求',
    sections['design-blueprint-requirements'] || '- 暂无'
  ].join('\n')
}

function buildDiagnosticsSummary(diagnostics: OFBlueprintTextDiagnostic[]): string {
  if (!diagnostics.length) {
    return '当前没有剩余 diagnostics。'
  }

  return [
    `当前剩余 diagnostics 共 ${diagnostics.length} 条。`,
    ...diagnostics.map((diagnostic, index) => {
      return `#${index + 1} ${buildOFBlueprintDiagnosticSignature(diagnostic)} ${diagnostic.message}`
    })
  ].join('\n')
}

function buildTargetDiagnosticsText(targetDiagnostics: OFBlueprintTextDiagnostic[]): string {
  if (!targetDiagnostics.length) {
    return '当前没有需要优先处理的 target diagnostics。'
  }

  return [
    '当前这一轮优先处理以下错误：',
    ...targetDiagnostics.map((diagnostic, index) => {
      return [
        `#${index + 1}`,
        `signature: ${buildOFBlueprintDiagnosticSignature(diagnostic)}`,
        `code: ${diagnostic.code}`,
        `path: ${diagnostic.path}`,
        `message: ${diagnostic.message}`,
        `location: ${diagnostic.line}:${diagnostic.column}-${diagnostic.endLine}:${diagnostic.endColumn}`,
        diagnostic.context ? `context: ${diagnostic.context}` : null
      ]
        .filter(Boolean)
        .join('\n')
    })
  ].join('\n\n')
}

function buildRelevantDslSections(
  sourceText: string,
  targetDiagnostics: OFBlueprintTextDiagnostic[]
): string {
  const sections = splitDslSections(sourceText)
  if (!sections.length || !targetDiagnostics.length) {
    return sourceText
  }

  const selectedSectionNames = new Set<string>()
  for (const diagnostic of targetDiagnostics) {
    const hitSection = sections.find((section) => {
      return diagnostic.line >= section.startLine && diagnostic.line <= section.endLine
    })
    if (!hitSection) {
      continue
    }

    selectedSectionNames.add(hitSection.name)

    if (hitSection.name.startsWith('subgraph.')) {
      const containerId = hitSection.name.slice('subgraph.'.length)
      sections.forEach((section) => {
        if (section.name.startsWith(`node.${containerId}.`)) {
          selectedSectionNames.add(section.name)
        }
      })
    }

    if (hitSection.name.startsWith('node.') && hitSection.name.split('.').length >= 3) {
      const containerId = hitSection.name.split('.')[1]
      selectedSectionNames.add(`subgraph.${containerId}`)
      selectedSectionNames.add(`node.${containerId}`)
    }
  }

  const selectedSections = sections.filter((section) => selectedSectionNames.has(section.name))
  if (!selectedSections.length) {
    return sourceText
  }

  return ['OFT/1', ...selectedSections.map((section) => section.text)].join('\n\n')
}

function splitDslSections(sourceText: string): Array<{
  name: string
  startLine: number
  endLine: number
  text: string
}> {
  const lines = sourceText.replace(/\r\n?/g, '\n').split('\n')
  const sections: Array<{ name: string; startLine: number; endLine: number; text: string }> = []
  let current: {
    name: string
    startLine: number
    lines: string[]
  } | null = null

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(/^\[([A-Za-z0-9_.-]+)\]$/)
    if (sectionMatch) {
      if (current) {
        sections.push({
          name: current.name,
          startLine: current.startLine,
          endLine: index,
          text: current.lines.join('\n').trim()
        })
      }
      current = {
        name: sectionMatch[1],
        startLine: index + 1,
        lines: [line]
      }
      return
    }

    if (current) {
      current.lines.push(line)
    }
  })

  if (current) {
    sections.push({
      name: current.name,
      startLine: current.startLine,
      endLine: lines.length,
      text: current.lines.join('\n').trim()
    })
  }

  return sections
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }
  return `${text.slice(0, Math.max(0, maxChars - 24))}\n...(已按预算截断)`
}
