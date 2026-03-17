import { listOFAuthoringNodeDefinitions } from '../node-definition-registry'
import { parseOFAuthoringToml } from './parser'
import type { OFAuthoringTomlDocument } from './types'
import type { CheckDiagnostic, CheckResult, CheckSeverity, LineAnnotation } from './checker-types'
import { buildTomlLineMap } from './line-mapper'

function severityRank(severity: CheckSeverity): number {
  switch (severity) {
    case 'error':
      return 3
    case 'warning':
      return 2
    case 'info':
      return 1
    default:
      return 0
  }
}

/**
 * 根据 diagnostics 的 lineRange 聚合每行标注。
 * 只输出有标注的行（减少结果体积）。
 */
function buildLineAnnotations(params: {
  diagnostics: CheckDiagnostic[]
  totalLines: number
}): LineAnnotation[] {
  const byLine = new Map<number, { severity: CheckSeverity; codes: Set<string> }>()

  for (const d of params.diagnostics) {
    const range = d.lineRange
    if (!range) {
      continue
    }

    const start = Math.max(1, range.start)
    const end = Math.min(params.totalLines, range.end)

    for (let line = start; line <= end; line++) {
      const existing = byLine.get(line)
      if (!existing) {
        byLine.set(line, { severity: d.severity, codes: new Set([d.code]) })
        continue
      }

      existing.codes.add(d.code)
      if (severityRank(d.severity) > severityRank(existing.severity)) {
        existing.severity = d.severity
      }
    }
  }

  return Array.from(byLine.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([line, v]) => ({
      line,
      severity: v.severity,
      diagnosticCodes: Array.from(v.codes)
    }))
}

function buildNodeIndexById(document: OFAuthoringTomlDocument): Map<string, number> {
  const map = new Map<string, number>()
  document.nodes.forEach((node, idx) => {
    map.set(node.id, idx)
  })
  return map
}

function validateFieldPresence(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []

  const definitions = new Map(
    listOFAuthoringNodeDefinitions().map((definition) => [definition.authoring.token, definition])
  )

  const lineMap = buildTomlLineMap(params.raw)

  // workflow.name 空
  if (!params.document.workflow.name.trim()) {
    diagnostics.push({
      category: 'field',
      code: 'workflow-name-missing',
      severity: 'error',
      message: 'workflow.name 不能为空',
      path: 'workflow.name',
      lineRange: lineMap.workflowRange || undefined
    })
  }

  params.document.nodes.forEach((node, index) => {
    const definition = definitions.get(node.type)
    const nodeLineRange = lineMap.nodeRanges.get(node.id)

    if (!definition) {
      diagnostics.push({
        category: 'field',
        code: 'unknown-node-type',
        severity: 'error',
        message: `未知节点类型：${String(node.type)}`,
        nodeId: node.id,
        path: `nodes[${index}].type`,
        lineRange: nodeLineRange,
        context: {
          nodeType: String(node.type),
          availableTypes: Array.from(definitions.keys())
        }
      })
      return
    }

    definition.authoring.toml.requiredFields.forEach((field) => {
      const value = (node as Record<string, unknown>)[field]
      const isMissing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0)

      if (!isMissing) {
        return
      }

      diagnostics.push({
        category: 'field',
        code: 'required-field-missing',
        severity: 'error',
        message: `节点 ${node.id} 缺少必填字段 ${field}`,
        nodeId: node.id,
        path: `nodes[${index}].${field}`,
        lineRange: nodeLineRange,
        context: {
          missingField: field,
          nodeType: node.type
        }
      })
    })
  })

  return diagnostics
}

function validateReferences(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []
  const nodeIdSet = new Set(params.document.nodes.map((node) => node.id))
  const lineMap = buildTomlLineMap(params.raw)

  params.document.edges.forEach((edge, index) => {
    const edgeLineRange = lineMap.edgeRanges.get(index)

    if (!nodeIdSet.has(edge.source)) {
      diagnostics.push({
        category: 'reference',
        code: 'edge-source-missing',
        severity: 'error',
        message: `边 ${index + 1} 引用了不存在的 source 节点 ${edge.source}`,
        path: `edges[${index}].source`,
        lineRange: edgeLineRange,
        context: {
          source: edge.source
        }
      })
    }

    if (!nodeIdSet.has(edge.target)) {
      diagnostics.push({
        category: 'reference',
        code: 'edge-target-missing',
        severity: 'error',
        message: `边 ${index + 1} 引用了不存在的 target 节点 ${edge.target}`,
        path: `edges[${index}].target`,
        lineRange: edgeLineRange,
        context: {
          target: edge.target
        }
      })
    }
  })

  return diagnostics
}

function validateTopology(document: OFAuthoringTomlDocument): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []
  const startNodes = document.nodes.filter((node) => node.type === 'start')
  const endNodes = document.nodes.filter((node) => node.type === 'end')

  if (startNodes.length !== 1) {
    diagnostics.push({
      category: 'topology',
      code: 'start-node-count-invalid',
      severity: 'error',
      message: '工作流必须且只能有一个 start 节点'
    })
  }

  if (endNodes.length < 1) {
    diagnostics.push({
      category: 'topology',
      code: 'end-node-missing',
      severity: 'error',
      message: '工作流至少需要一个 end 节点'
    })
  }

  return diagnostics
}

function validateSemantic(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []
  const lineMap = buildTomlLineMap(params.raw)
  const nodeIndexById = buildNodeIndexById(params.document)

  params.document.nodes.forEach((node) => {
    if (
      (node.type === 'iter' || node.type === 'loop') &&
      !(node as Record<string, unknown>).subgraph
    ) {
      const idx = nodeIndexById.get(node.id) ?? -1
      diagnostics.push({
        category: 'semantic',
        code: 'subgraph-required',
        severity: 'error',
        message: `节点 ${node.id} 需要提供 subgraph`,
        nodeId: node.id,
        path: idx >= 0 ? `nodes[${idx}].subgraph` : undefined,
        lineRange: lineMap.nodeRanges.get(node.id),
        context: {
          nodeType: node.type
        }
      })
    }
  })

  return diagnostics
}

/**
 * 对原始 TOML 文本执行完整静态检查。
 * 纯函数，无 IO，可在 renderer / main / utility 任意环境调用。
 */
export function checkOFAuthoringToml(raw: string): CheckResult {
  const lineMap = buildTomlLineMap(raw)
  const parsed = parseOFAuthoringToml(raw)

  // 语法错误：直接返回（此时没有 document）
  if (!parsed.document) {
    const diagnostics: CheckDiagnostic[] = parsed.diagnostics.map((d) => ({
      category: d.category,
      code: d.code,
      severity: 'error',
      message: d.message,
      nodeId: d.nodeId,
      path: d.path,
      // 语法错误通常无法可靠定位，这里给 workflowRange 兜底；后续可再增强
      lineRange: lineMap.workflowRange || undefined
    }))

    return {
      passed: false,
      diagnostics,
      lineAnnotations: buildLineAnnotations({ diagnostics, totalLines: lineMap.totalLines })
    }
  }

  const document: OFAuthoringTomlDocument = parsed.document

  const diagnostics: CheckDiagnostic[] = [
    ...validateFieldPresence({ document, raw }),
    ...validateReferences({ document, raw }),
    ...validateTopology(document),
    ...validateSemantic({ document, raw })
  ]

  const passed = diagnostics.every((d) => d.severity !== 'error')

  return {
    passed,
    diagnostics,
    lineAnnotations: buildLineAnnotations({ diagnostics, totalLines: lineMap.totalLines })
  }
}
