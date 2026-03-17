/**
 * TOML 原文 → 行号映射。
 * 目标：为诊断结果附加 lineRange，并支持前端逐行标红。
 *
 * 设计约束：
 * - 纯函数，无 IO
 * - 正则逐行扫描，不依赖节点类型细节
 */
export interface TomlLineMap {
  /** nodeId → 该节点块在原始文本中的行范围 */
  nodeRanges: Map<string, { start: number; end: number }>
  /** edgeIndex (0-based) → 该条边在原始文本中的行范围 */
  edgeRanges: Map<number, { start: number; end: number }>
  /** workflow section 的行范围 */
  workflowRange: { start: number; end: number } | null
  /** 总行数 */
  totalLines: number
}

type SectionKind = 'workflow' | 'node' | 'edge' | 'other'

interface PendingSection {
  kind: SectionKind
  startLine: number
  nodeId?: string
  edgeIndex?: number
}

const NODE_SECTION_RE = /^\s*\[\[nodes\]\]\s*$/
const EDGE_SECTION_RE = /^\s*\[\[edges\]\]\s*$/
const WORKFLOW_SECTION_RE = /^\s*\[workflow\]\s*$/

// 段内提取 id = "xxx"（尽量宽松：允许单引号）
const NODE_ID_RE = /^\s*id\s*=\s*("([^"]+)"|'([^']+)')\s*$/

/**
 * 构建 TOML 行号映射。
 *
 * 注意：
 * - 只根据 [[nodes]] / [[edges]] / [workflow] 分段
 * - nodeId 从节点段内的 id 字段提取
 */
export function buildTomlLineMap(raw: string): TomlLineMap {
  const lines = raw.split(/\r?\n/)

  const nodeRanges = new Map<string, { start: number; end: number }>()
  const edgeRanges = new Map<number, { start: number; end: number }>()

  let workflowRange: { start: number; end: number } | null = null
  let current: PendingSection | null = null
  let currentEdgeIndex = -1

  function finalizeSection(endLine: number): void {
    if (!current) {
      return
    }

    if (current.kind === 'workflow') {
      workflowRange = { start: current.startLine, end: endLine }
    }

    if (current.kind === 'node' && current.nodeId) {
      nodeRanges.set(current.nodeId, { start: current.startLine, end: endLine })
    }

    if (current.kind === 'edge' && typeof current.edgeIndex === 'number') {
      edgeRanges.set(current.edgeIndex, { start: current.startLine, end: endLine })
    }

    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const line = lines[i] ?? ''

    // 先判断是否遇到新的 section 头，如果是，先 finalize 上一个 section
    if (WORKFLOW_SECTION_RE.test(line)) {
      finalizeSection(lineNumber - 1)
      current = { kind: 'workflow', startLine: lineNumber }
      continue
    }

    if (NODE_SECTION_RE.test(line)) {
      finalizeSection(lineNumber - 1)
      current = { kind: 'node', startLine: lineNumber }
      continue
    }

    if (EDGE_SECTION_RE.test(line)) {
      finalizeSection(lineNumber - 1)
      currentEdgeIndex += 1
      current = { kind: 'edge', startLine: lineNumber, edgeIndex: currentEdgeIndex }
      continue
    }

    // 段内扫描 nodeId
    if (current?.kind === 'node' && !current.nodeId) {
      const m = line.match(NODE_ID_RE)
      const id = (m?.[2] || m?.[3] || '').trim()
      if (id) {
        current.nodeId = id
      }
    }
  }

  // finalize 最后一个 section
  finalizeSection(lines.length)

  return {
    nodeRanges,
    edgeRanges,
    workflowRange,
    totalLines: lines.length
  }
}
