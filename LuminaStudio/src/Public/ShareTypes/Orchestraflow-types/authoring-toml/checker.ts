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

function validateHandles(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []

  const definitions = new Map(
    listOFAuthoringNodeDefinitions().map((definition) => [definition.authoring.token, definition])
  )
  const nodeById = new Map(params.document.nodes.map((node) => [node.id, node]))
  const lineMap = buildTomlLineMap(params.raw)

  // nodeId -> 允许的输入/输出 handle 列表（从 runtime.ports 动态读取）
  // 注意：If 节点的“真实可用 sourceHandle”还依赖 cases[].handleId（动态），会在下面单独处理。
  const nodeHandles = new Map<string, { inputs: Set<string>; outputs: Set<string> }>()

  for (const node of params.document.nodes) {
    const def = definitions.get(node.type)
    if (!def) continue
    nodeHandles.set(node.id, {
      inputs: new Set(def.runtime.ports.filter((p) => p.direction === 'input').map((p) => p.id)),
      outputs: new Set(def.runtime.ports.filter((p) => p.direction === 'output').map((p) => p.id))
    })
  }

  // If 节点：允许的 sourceHandle = cases[].handleId + else
  // 说明：这是 IfElse 的真实运行契约（见 ifNodeRuntimeDefinition.runtime_invariants）。
  const ifBranchHandleByNodeId = new Map<string, Set<string>>()
  for (const node of params.document.nodes) {
    if (node.type !== 'if') {
      continue
    }

    const handles = new Set<string>()
    handles.add('else')

    const cases = Array.isArray((node as Record<string, unknown>).cases)
      ? ((node as Record<string, unknown>).cases as unknown[])
      : []

    for (const item of cases) {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
      const handleId = String(record?.handleId || '').trim()
      if (handleId) {
        handles.add(handleId)
      }
    }

    ifBranchHandleByNodeId.set(node.id, handles)
  }

  params.document.edges.forEach((edge, index) => {
    const edgeLineRange = lineMap.edgeRanges.get(index)

    // ========== sourceHandle 校验 ==========

    if (edge.sourceHandle) {
      const sourceNodeType = nodeById.get(edge.source)?.type

      // If 节点优先使用“分支 handle 集合”校验（cases[].handleId + else）
      if (sourceNodeType === 'if') {
        const allowed = ifBranchHandleByNodeId.get(edge.source)
        if (allowed && !allowed.has(edge.sourceHandle)) {
          diagnostics.push({
            category: 'handle',
            code: 'ifelse-source-handle-not-a-branch',
            severity: 'error',
            message: `If 节点 ${edge.source} 的 sourceHandle "${edge.sourceHandle}" 不匹配任何分支（应为 cases[].handleId 或 else）`,
            path: `edges[${index}].sourceHandle`,
            lineRange: edgeLineRange,
            context: {
              nodeType: sourceNodeType,
              nodeId: edge.source,
              handle: edge.sourceHandle,
              allowedHandles: Array.from(allowed)
            }
          })
        }
      } else {
        const handles = nodeHandles.get(edge.source)
        if (handles && !handles.outputs.has(edge.sourceHandle)) {
          diagnostics.push({
            category: 'handle',
            code: 'invalid-source-handle',
            severity: 'error',
            message: `边 ${index + 1} 的 sourceHandle "${edge.sourceHandle}" 不在节点 ${edge.source} 的输出端口列表中`,
            path: `edges[${index}].sourceHandle`,
            lineRange: edgeLineRange,
            context: {
              nodeType: sourceNodeType,
              nodeId: edge.source,
              handle: edge.sourceHandle,
              allowedHandles: handles ? Array.from(handles.outputs) : []
            }
          })
        }
      }
    }

    // ========== targetHandle 校验 ==========

    if (edge.targetHandle) {
      const handles = nodeHandles.get(edge.target)
      if (handles && !handles.inputs.has(edge.targetHandle)) {
        diagnostics.push({
          category: 'handle',
          code: 'invalid-target-handle',
          severity: 'error',
          message: `边 ${index + 1} 的 targetHandle "${edge.targetHandle}" 不在节点 ${edge.target} 的输入端口列表中`,
          path: `edges[${index}].targetHandle`,
          lineRange: edgeLineRange,
          context: {
            nodeType: nodeById.get(edge.target)?.type,
            nodeId: edge.target,
            handle: edge.targetHandle,
            allowedHandles: Array.from(handles.inputs)
          }
        })
      }
    }
  })

  return diagnostics
}

function getNodeOutputFieldNames(node: OFAuthoringTomlDocument['nodes'][number]): Set<string> {
  const set = new Set<string>()

  // 说明：这里的 fieldName 指 authoring 层 selector 的第二段（[nodeId, field] 里的 field）。
  // 目标是覆盖“最常见、最稳”的输出变量：
  // - start: inputs[].variable
  // - llm: llmoutput (+ struct 存在时 structured_output)
  // - set: rules[].target_variable
  // - iter/loop: result（loop 额外包含 loop_variables[].variable）
  switch (node.type) {
    case 'start': {
      const inputs = Array.isArray((node as Record<string, unknown>).inputs)
        ? ((node as Record<string, unknown>).inputs as unknown[])
        : []
      for (const item of inputs) {
        const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
        const variable = String(record?.variable || '').trim()
        if (variable) {
          set.add(variable)
        }
      }
      return set
    }

    case 'llm': {
      set.add('llmoutput')
      const struct = String((node as Record<string, unknown>).struct || '').trim()
      if (struct) {
        set.add('structured_output')
      }
      return set
    }

    case 'set': {
      const rules = Array.isArray((node as Record<string, unknown>).rules)
        ? ((node as Record<string, unknown>).rules as unknown[])
        : []
      for (const item of rules) {
        const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
        const variable = String(record?.target_variable || '').trim()
        if (variable) {
          set.add(variable)
        }
      }
      return set
    }

    case 'iter': {
      set.add('result')
      return set
    }

    case 'loop': {
      set.add('result')
      const vars = Array.isArray((node as Record<string, unknown>).loop_variables)
        ? ((node as Record<string, unknown>).loop_variables as unknown[])
        : []
      for (const item of vars) {
        const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
        const variable = String(record?.variable || '').trim()
        if (variable) {
          set.add(variable)
        }
      }
      return set
    }

    case 'knowledge-retrieval': {
      set.add('query')
      set.add('total_scopes')
      set.add('total_hits')
      set.add('partial_failure')
      set.add('items')
      set.add('result')
      return set
    }

    case 'paper-retrieval': {
      set.add('query')
      set.add('provider')
      set.add('total_found')
      set.add('returned_count')
      set.add('items')
      set.add('latency_ms')
      set.add('result')
      return set
    }

    default:
      return set
  }
}

function validateSelectors(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []

  const nodeIdSet = new Set(params.document.nodes.map((node) => node.id))
  const nodeIndexById = buildNodeIndexById(params.document)
  const lineMap = buildTomlLineMap(params.raw)

  const outputFieldsByNodeId = new Map<string, Set<string>>()
  params.document.nodes.forEach((node) => {
    outputFieldsByNodeId.set(node.id, getNodeOutputFieldNames(node))
  })

  function pushSelectorDiagnostic(args: {
    code: string
    severity: CheckSeverity
    message: string
    nodeId?: string
    path?: string
    lineRange?: { start: number; end: number }
    context?: Record<string, unknown>
  }): void {
    diagnostics.push({
      category: 'variable',
      code: args.code,
      severity: args.severity,
      message: args.message,
      nodeId: args.nodeId,
      path: args.path,
      lineRange: args.lineRange,
      context: args.context
    })
  }

  // 递归扫描：只抓取“可能是 selector 的字段”。
  // 说明：这里尽量用“键名白名单”，避免误把普通数组当 selector。
  function scan(value: unknown, ctx: { nodeId: string; nodeType: string; path: string }): void {
    if (!value || typeof value !== 'object') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        scan(item, { ...ctx, path: `${ctx.path}[${idx}]` })
      })
      return
    }

    const record = value as Record<string, unknown>

    const selectorLikeKeys = new Set([
      'variable_selector',
      'iterator_selector',
      'output_selector',
      'value_selector'
    ])

    for (const [k, v] of Object.entries(record)) {
      const childPath = ctx.path ? `${ctx.path}.${k}` : k

      if (selectorLikeKeys.has(k)) {
        validateOneSelector(v, {
          ownerNodeId: ctx.nodeId,
          ownerNodeType: ctx.nodeType,
          path: childPath,
          lineRange: lineMap.nodeRanges.get(ctx.nodeId)
        })
        continue
      }

      // set.rules[].source.ref.selector
      if (k === 'selector' && ctx.path.endsWith('.ref')) {
        validateOneSelector(v, {
          ownerNodeId: ctx.nodeId,
          ownerNodeType: ctx.nodeType,
          path: childPath,
          lineRange: lineMap.nodeRanges.get(ctx.nodeId)
        })
        continue
      }

      scan(v, { ...ctx, path: childPath })
    }
  }

  function validateOneSelector(
    selector: unknown,
    meta: {
      ownerNodeId: string
      ownerNodeType: string
      path: string
      lineRange?: { start: number; end: number }
    }
  ): void {
    if (selector === undefined || selector === null) {
      return
    }

    // selector 必须是数组
    if (!Array.isArray(selector)) {
      pushSelectorDiagnostic({
        code: 'selector-format-invalid',
        severity: 'error',
        message: `selector 格式错误：期望数组 ["nodeId", "field"]，但实际是 ${typeof selector}`,
        nodeId: meta.ownerNodeId,
        path: meta.path,
        lineRange: meta.lineRange,
        context: { nodeType: meta.ownerNodeType }
      })
      return
    }

    const segments = selector.map((s) => String(s).trim()).filter(Boolean)
    if (segments.length === 0) {
      pushSelectorDiagnostic({
        code: 'selector-empty',
        severity: 'error',
        message: 'selector 不能为空',
        nodeId: meta.ownerNodeId,
        path: meta.path,
        lineRange: meta.lineRange,
        context: { nodeType: meta.ownerNodeType }
      })
      return
    }

    // 兼容：authoring 允许引用局部变量根（如 item/index/...），因此 length=1 不报错。
    // 但如果作者写成 ["a.b"]，给一个 warning，提示拆成两段。
    if (segments.length === 1 && segments[0].includes('.')) {
      const [head, ...rest] = segments[0].split('.')
      pushSelectorDiagnostic({
        code: 'selector-legacy-dot-path',
        severity: 'warning',
        message: `selector 建议拆成数组段：例如 ["${head}", "${rest.join('.')}" ]`,
        nodeId: meta.ownerNodeId,
        path: meta.path,
        lineRange: meta.lineRange,
        context: { nodeType: meta.ownerNodeType, selector: segments }
      })
      return
    }

    if (segments.length < 2) {
      return
    }

    const [refNodeId, field] = segments

    if (!nodeIdSet.has(refNodeId)) {
      pushSelectorDiagnostic({
        code: 'selector-node-not-found',
        severity: 'error',
        message: `selector 引用了不存在的节点：${refNodeId}`,
        nodeId: meta.ownerNodeId,
        path: meta.path,
        lineRange: meta.lineRange,
        context: {
          nodeType: meta.ownerNodeType,
          refNodeId
        }
      })
      return
    }

    const allowed = outputFieldsByNodeId.get(refNodeId)
    if (allowed && allowed.size > 0 && !allowed.has(field)) {
      const refIndex = nodeIndexById.get(refNodeId)
      pushSelectorDiagnostic({
        code: 'selector-field-not-found',
        severity: 'error',
        message: `selector 引用了节点 ${refNodeId} 不存在的输出字段：${field}`,
        nodeId: meta.ownerNodeId,
        path: meta.path,
        lineRange: meta.lineRange,
        context: {
          nodeType: meta.ownerNodeType,
          refNodeId,
          refNodeType: refIndex !== undefined ? params.document.nodes[refIndex]?.type : undefined,
          field,
          availableFields: Array.from(allowed)
        }
      })
    }
  }

  // 扫描每个节点 record
  params.document.nodes.forEach((node) => {
    scan(node as unknown, {
      nodeId: node.id,
      nodeType: node.type,
      path: ''
    })
  })

  return diagnostics
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateDefaultValues(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []
  const lineMap = buildTomlLineMap(params.raw)
  const nodeIndexById = buildNodeIndexById(params.document)

  function push(d: Omit<CheckDiagnostic, 'category'>): void {
    diagnostics.push({
      category: 'default-value',
      ...d
    })
  }

  params.document.nodes.forEach((node) => {
    const nodeLineRange = lineMap.nodeRanges.get(node.id)
    const nodeIndex = nodeIndexById.get(node.id) ?? -1

    // 1) start.inputs[].schema.default
    if (node.type === 'start') {
      const inputs = Array.isArray((node as Record<string, unknown>).inputs)
        ? ((node as Record<string, unknown>).inputs as unknown[])
        : []

      inputs.forEach((item, inputIndex) => {
        const record = isPlainObject(item) ? item : null
        const variable = String(record?.variable || '').trim()
        const schema = isPlainObject(record?.schema)
          ? (record?.schema as Record<string, unknown>)
          : null
        if (!schema) return

        if (!Object.prototype.hasOwnProperty.call(schema, 'default')) {
          return
        }

        const schemaType = String(schema.type || '').trim()
        const defValue = schema.default

        const ok =
          (schemaType === 'string' && (typeof defValue === 'string' || defValue === null)) ||
          (schemaType === 'number' && (typeof defValue === 'number' || defValue === null)) ||
          (schemaType === 'boolean' && (typeof defValue === 'boolean' || defValue === null)) ||
          (schemaType === 'array' && (Array.isArray(defValue) || defValue === null)) ||
          (schemaType === 'object' && (isPlainObject(defValue) || defValue === null))

        if (!ok && schemaType) {
          push({
            code: 'default-value-type-mismatch',
            severity: 'error',
            message: `Start.inputs[${inputIndex}] 变量 ${variable || '(未命名)'} 的 schema.default 类型不匹配：期望 ${schemaType}`,
            nodeId: node.id,
            path:
              nodeIndex >= 0
                ? `nodes[${nodeIndex}].inputs[${inputIndex}].schema.default`
                : undefined,
            lineRange: nodeLineRange,
            context: {
              nodeType: node.type,
              expectedType: schemaType,
              actualType: Array.isArray(defValue) ? 'array' : typeof defValue
            }
          })
        }
      })
    }

    // 2) set.rules：
    // - mode=variable：必须有 ref.selector
    // - mode=constant：必须有 constant_value，并且类型与 target_type 一致
    if (node.type === 'set') {
      const rules = Array.isArray((node as Record<string, unknown>).rules)
        ? ((node as Record<string, unknown>).rules as unknown[])
        : []

      rules.forEach((item, ruleIndex) => {
        const rule = isPlainObject(item) ? item : null
        if (!rule) return

        const source = isPlainObject(rule.source) ? (rule.source as Record<string, unknown>) : null
        const mode = String(source?.mode || 'constant')

        // mode=variable：校验 ref.selector 是否存在
        if (mode === 'variable') {
          const ref = isPlainObject(source?.ref) ? (source?.ref as Record<string, unknown>) : null
          const selector = ref?.selector
          const ok = Array.isArray(selector) && selector.length > 0

          if (!ok) {
            push({
              code: 'set-variable-ref-missing',
              severity: 'error',
              message: `Set.rules[${ruleIndex}] 当 source.mode="variable" 时，必须提供 ref.selector（数组）`,
              nodeId: node.id,
              path:
                nodeIndex >= 0
                  ? `nodes[${nodeIndex}].rules[${ruleIndex}].source.ref.selector`
                  : undefined,
              lineRange: nodeLineRange,
              context: {
                nodeType: node.type
              }
            })
          }

          return
        }

        // mode=constant：校验 constant_value 是否存在 + 类型是否匹配 target_type
        const targetType = String(rule.target_type || '').trim()

        if (!Object.prototype.hasOwnProperty.call(source || {}, 'constant_value')) {
          push({
            code: 'set-constant-value-missing',
            severity: 'error',
            message: `Set.rules[${ruleIndex}] 当 source.mode="constant" 时，必须提供 constant_value`,
            nodeId: node.id,
            path:
              nodeIndex >= 0
                ? `nodes[${nodeIndex}].rules[${ruleIndex}].source.constant_value`
                : undefined,
            lineRange: nodeLineRange,
            context: {
              nodeType: node.type
            }
          })
          return
        }

        const value = (source as Record<string, unknown>).constant_value
        if (!targetType) return

        const ok =
          (targetType === 'string' && (typeof value === 'string' || value === null)) ||
          (targetType === 'number' && (typeof value === 'number' || value === null)) ||
          (targetType === 'boolean' && (typeof value === 'boolean' || value === null)) ||
          (targetType === 'object' && (isPlainObject(value) || value === null)) ||
          (targetType === 'array' && (Array.isArray(value) || value === null))

        if (!ok) {
          push({
            code: 'constant-value-type-mismatch',
            severity: 'error',
            message: `Set.rules[${ruleIndex}] 的 constant_value 类型不匹配：target_type=${targetType}`,
            nodeId: node.id,
            path:
              nodeIndex >= 0
                ? `nodes[${nodeIndex}].rules[${ruleIndex}].source.constant_value`
                : undefined,
            lineRange: nodeLineRange,
            context: {
              nodeType: node.type,
              expectedType: targetType,
              actualType: Array.isArray(value) ? 'array' : typeof value
            }
          })
        }
      })
    }

    // 3) loop.loop_variables(value_type=constant) 必须有 value
    if (node.type === 'loop') {
      const vars = Array.isArray((node as Record<string, unknown>).loop_variables)
        ? ((node as Record<string, unknown>).loop_variables as unknown[])
        : []

      vars.forEach((item, varIndex) => {
        const record = isPlainObject(item) ? item : null
        if (!record) return

        const valueType = String(record.value_type || 'constant')
        if (valueType !== 'constant') return

        if (!Object.prototype.hasOwnProperty.call(record, 'value')) {
          push({
            code: 'constant-value-missing',
            severity: 'error',
            message: `Loop.loop_variables[${varIndex}] 为 constant 模式时必须提供 value`,
            nodeId: node.id,
            path:
              nodeIndex >= 0 ? `nodes[${nodeIndex}].loop_variables[${varIndex}].value` : undefined,
            lineRange: nodeLineRange,
            context: {
              nodeType: node.type
            }
          })
        }
      })
    }
  })

  return diagnostics
}

function validateTopology(params: {
  document: OFAuthoringTomlDocument
  raw: string
}): CheckDiagnostic[] {
  const diagnostics: CheckDiagnostic[] = []
  const startNodes = params.document.nodes.filter((node) => node.type === 'start')
  const endNodes = params.document.nodes.filter((node) => node.type === 'end')
  const lineMap = buildTomlLineMap(params.raw)

  if (startNodes.length !== 1) {
    diagnostics.push({
      category: 'topology',
      code: 'start-node-count-invalid',
      severity: 'error',
      message: '工作流必须且只能有一个 start 节点',
      path: 'nodes',
      lineRange: lineMap.workflowRange || undefined
    })
  }

  if (endNodes.length < 1) {
    diagnostics.push({
      category: 'topology',
      code: 'end-node-missing',
      severity: 'error',
      message: '工作流至少需要一个 end 节点',
      path: 'nodes',
      lineRange: lineMap.workflowRange || undefined
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

  const fieldDiagnostics = validateFieldPresence({ document, raw })
  const hasUnknownNodeType = fieldDiagnostics.some((d) => d.code === 'unknown-node-type')

  // 说明：
  // - 当存在 unknown-node-type 时，handle/selector/default-value 的部分检查无法可靠进行
  // - 这里先跳过，避免二次报错干扰用户
  const extraDiagnostics = hasUnknownNodeType
    ? []
    : [
        ...validateHandles({ document, raw }),
        ...validateSelectors({ document, raw }),
        ...validateDefaultValues({ document, raw })
      ]

  const diagnostics: CheckDiagnostic[] = [
    ...fieldDiagnostics,
    ...validateReferences({ document, raw }),
    ...extraDiagnostics,
    ...validateTopology({ document, raw }),
    ...validateSemantic({ document, raw })
  ]

  const passed = diagnostics.every((d) => d.severity !== 'error')

  return {
    passed,
    diagnostics,
    lineAnnotations: buildLineAnnotations({ diagnostics, totalLines: lineMap.totalLines })
  }
}
