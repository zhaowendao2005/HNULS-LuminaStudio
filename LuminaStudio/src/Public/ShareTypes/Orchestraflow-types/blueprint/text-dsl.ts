import type { OFRunnableWorkflow } from '../contract'
import { resolveOFNodeDefinition } from '../node-definition-registry'
import { OFBlockEnum } from '../core-types'
import { compileOFBlueprintToRunnable } from './compiler'
import type {
  OFBlueprintNode,
  OFBlueprintTextAssignmentAst,
  OFBlueprintTextAst,
  OFBlueprintTextCompileResult,
  OFBlueprintTextDiagnostic,
  OFBlueprintTextEdgeAst,
  OFBlueprintTextGraphAst,
  OFBlueprintTextLocation,
  OFBlueprintTextParseResult,
  OFBlueprintTextPathSegment,
  OFBlueprintTextValue,
  OFBlueprintValidationIssue,
  OFBlueprintWorkflow
} from './types'
import { validateOFBlueprint } from './validator'

const DSL_HEADER = 'BLUEPRINT DSL 1.0'
const NODE_PATTERN = /^NODE\s+([A-Za-z0-9_-]+)\s+TYPE\s+([A-Za-z0-9_-]+)\s*$/
const EDGE_PATTERN =
  /^EDGE\s+([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?\s*->\s*([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?\s*$/
const SUBGRAPH_PATTERN = /^SUBGRAPH\s+([A-Za-z0-9_-]+)\s*$/
const END_SUBGRAPH_PATTERN = /^ENDSUBGRAPH\s*$/
const SET_INLINE_PATTERN = /^SET\s+([A-Za-z0-9_.\-[\]]+)\s*=\s*(.+)\s*$/
const SET_HEREDOC_PATTERN = /^SET\s+([A-Za-z0-9_.\-[\]]+)\s*<<([A-Z][A-Z0-9_]*)\s*$/

type GraphParseContext = {
  lines: string[]
  diagnostics: OFBlueprintTextDiagnostic[]
}

type MutableGraphState = {
  nodes: OFBlueprintTextGraphAst['nodes']
  edges: OFBlueprintTextGraphAst['edges']
}

type GraphCompileContext = {
  graphLabel: string
  allowContainers: boolean
}

type NodeCompileResult = {
  blueprintNode: OFBlueprintNode | null
  diagnostics: OFBlueprintTextDiagnostic[]
}

/**
 * 这里使用“行式 DSL + 注释 + heredoc”格式，避免再引入 YAML/PEG 依赖。
 * 后续 public 定义新增节点时，parser 不需要改语法，只依赖 shared registry/contract 做语义校验。
 */
export function parseOFBlueprintTextDsl(sourceText: string): OFBlueprintTextParseResult {
  const normalizedText = sourceText.replace(/\r\n?/g, '\n')
  const lines = normalizedText.split('\n')
  const diagnostics: OFBlueprintTextDiagnostic[] = []

  const headerLineIndex = findFirstMeaningfulLine(lines)
  if (headerLineIndex < 0) {
    diagnostics.push(
      createDiagnostic({
        code: 'missing-header',
        message: `首行必须是 ${DSL_HEADER}。`,
        path: 'header',
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: DSL_HEADER.length
      })
    )
    return {
      ast: null,
      diagnostics,
      valid: false
    }
  }

  if (lines[headerLineIndex].trim() !== DSL_HEADER) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-header',
        message: `首个非注释行必须严格等于 ${DSL_HEADER}。`,
        path: 'header',
        line: headerLineIndex + 1,
        column: 1,
        endLine: headerLineIndex + 1,
        endColumn: lines[headerLineIndex].length || 1,
        context: lines[headerLineIndex].trim()
      })
    )
    return {
      ast: null,
      diagnostics,
      valid: false
    }
  }

  const context: GraphParseContext = { lines, diagnostics }
  const parsedGraph = parseGraphAst(context, headerLineIndex + 1, null)

  if (parsedGraph.nextLineIndex < lines.length) {
    const line = lines[parsedGraph.nextLineIndex]
    diagnostics.push(
      createDiagnostic({
        code: 'unexpected-endsubgraph',
        message: '根图中出现了孤立的 ENDSUBGRAPH。',
        path: 'graph',
        line: parsedGraph.nextLineIndex + 1,
        column: 1,
        endLine: parsedGraph.nextLineIndex + 1,
        endColumn: line.length || 1,
        context: line.trim()
      })
    )
  }

  return {
    ast: {
      version: '1.0',
      workflowAssignments: parsedGraph.workflowAssignments,
      graph: parsedGraph.graph
    },
    diagnostics,
    valid: diagnostics.length === 0
  }
}

export function compileOFBlueprintTextAst(ast: OFBlueprintTextAst): OFBlueprintTextCompileResult {
  const diagnostics: OFBlueprintTextDiagnostic[] = []
  const workflowMeta = {
    name: '',
    description: undefined as string | undefined,
    author: undefined as string | undefined
  }

  ast.workflowAssignments.forEach((assignment) => {
    applyWorkflowAssignment(workflowMeta, assignment, diagnostics)
  })

  const graphResult = compileGraphAst(ast.graph, { graphLabel: 'nodes', allowContainers: true })
  diagnostics.push(...graphResult.diagnostics)

  const blueprint =
    diagnostics.length === 0
      ? ({
          version: '2.0',
          workflow: workflowMeta,
          nodes: graphResult.nodes,
          edges: graphResult.edges
        } satisfies OFBlueprintWorkflow)
      : null

  if (blueprint) {
    const validationResult = validateOFBlueprint(blueprint)
    diagnostics.push(...mapBlueprintValidationIssues(validationResult.issues, ast))
  }

  const runnable =
    blueprint && diagnostics.length === 0 ? tryCompileRunnable(blueprint, ast, diagnostics) : null

  return {
    ast,
    diagnostics,
    valid: diagnostics.length === 0,
    blueprint,
    runnable
  }
}

export function compileOFBlueprintTextDsl(sourceText: string): OFBlueprintTextCompileResult {
  const parseResult = parseOFBlueprintTextDsl(sourceText)
  if (!parseResult.ast) {
    return {
      ...parseResult,
      blueprint: null,
      runnable: null
    }
  }

  const compileResult = compileOFBlueprintTextAst(parseResult.ast)
  return {
    ...compileResult,
    diagnostics: [...parseResult.diagnostics, ...compileResult.diagnostics],
    valid: parseResult.diagnostics.length === 0 && compileResult.valid
  }
}

export function buildOFBlueprintTextDslGuide(): string {
  return [
    `固定头部：${DSL_HEADER}`,
    '允许全行注释，以 # 开头。',
    '节点声明格式：NODE <node-id> TYPE <node-type>。',
    '连线格式：EDGE <from-node>[.<handle>] -> <to-node>[.<handle>]。',
    '进入子图格式：SUBGRAPH <container-node-id>，结束使用 ENDSUBGRAPH。',
    '赋值格式：SET workflow.<field> = <json-literal>。',
    '节点赋值格式：SET <node-id>.data.<path> = <json-literal>。',
    '可选简写：SET <node-id>.config.<path> = <json-literal>。',
    '多行字符串：SET <path> <<TEXT ... TEXT。',
    '多行 JSON：SET <path> <<JSON ... JSON。',
    '字符串必须双引号；数组和对象必须是合法 JSON。'
  ].join('\n')
}

function parseGraphAst(
  context: GraphParseContext,
  startLineIndex: number,
  stopAtContainerId: string | null
): {
  graph: OFBlueprintTextGraphAst
  workflowAssignments: OFBlueprintTextAssignmentAst[]
  nextLineIndex: number
} {
  const state: MutableGraphState = {
    nodes: [],
    edges: []
  }
  const workflowAssignments: OFBlueprintTextAssignmentAst[] = []
  const nodeById = new Map<string, OFBlueprintTextGraphAst['nodes'][number]>()

  let cursor = startLineIndex
  while (cursor < context.lines.length) {
    const rawLine = context.lines[cursor]
    const trimmed = rawLine.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      cursor += 1
      continue
    }

    if (END_SUBGRAPH_PATTERN.test(trimmed)) {
      if (!stopAtContainerId) {
        return {
          graph: { nodes: state.nodes, edges: state.edges },
          workflowAssignments,
          nextLineIndex: cursor
        }
      }
      return {
        graph: { nodes: state.nodes, edges: state.edges },
        workflowAssignments,
        nextLineIndex: cursor + 1
      }
    }

    const nodeMatch = trimmed.match(NODE_PATTERN)
    if (nodeMatch) {
      const [, nodeId, nodeType] = nodeMatch
      if (nodeById.has(nodeId)) {
        context.diagnostics.push(
          createLineDiagnostic(
            'duplicate-node',
            `节点 ${nodeId} 重复声明。`,
            `nodes.${nodeId}`,
            cursor,
            rawLine
          )
        )
        cursor += 1
        continue
      }

      const location = createLineLocation(cursor, rawLine)
      const nodeAst = {
        kind: 'node' as const,
        id: nodeId,
        type: nodeType,
        assignments: [],
        subgraph: null,
        location
      }
      state.nodes.push(nodeAst)
      nodeById.set(nodeId, nodeAst)
      cursor += 1
      continue
    }

    const edgeMatch = trimmed.match(EDGE_PATTERN)
    if (edgeMatch) {
      const [, fromNodeId, fromHandle, toNodeId, toHandle] = edgeMatch
      state.edges.push({
        kind: 'edge',
        fromNodeId,
        fromHandle: fromHandle || null,
        toNodeId,
        toHandle: toHandle || null,
        location: createLineLocation(cursor, rawLine)
      })
      cursor += 1
      continue
    }

    const subgraphMatch = trimmed.match(SUBGRAPH_PATTERN)
    if (subgraphMatch) {
      const [, containerId] = subgraphMatch
      const targetNode = nodeById.get(containerId)
      if (!targetNode) {
        context.diagnostics.push(
          createLineDiagnostic(
            'unknown-subgraph-node',
            `SUBGRAPH 引用了尚未声明的容器节点 ${containerId}。`,
            `nodes.${containerId}`,
            cursor,
            rawLine
          )
        )
        cursor += 1
        continue
      }

      if (targetNode.subgraph) {
        context.diagnostics.push(
          createLineDiagnostic(
            'duplicate-subgraph',
            `节点 ${containerId} 只能声明一个子图。`,
            `nodes.${containerId}.subgraph`,
            cursor,
            rawLine
          )
        )
        cursor += 1
        continue
      }

      const nestedGraph = parseGraphAst(context, cursor + 1, containerId)
      if (nestedGraph.workflowAssignments.length > 0) {
        nestedGraph.workflowAssignments.forEach((assignment) => {
          context.diagnostics.push(
            createDiagnostic({
              code: 'workflow-assignment-in-subgraph',
              message: '子图内禁止修改 workflow.* 字段。',
              path: assignment.rawPath,
              ...assignment.location
            })
          )
        })
      }
      targetNode.subgraph = nestedGraph.graph
      cursor = nestedGraph.nextLineIndex
      continue
    }

    const parsedAssignment = parseAssignmentAst(context.lines, cursor, rawLine, context.diagnostics)
    if (parsedAssignment) {
      cursor = parsedAssignment.nextLineIndex
      if (!parsedAssignment.assignment) {
        continue
      }

      if (parsedAssignment.assignment.target === 'workflow') {
        workflowAssignments.push(parsedAssignment.assignment)
        continue
      }

      const targetNode = nodeById.get(parsedAssignment.assignment.targetId || '')
      if (!targetNode) {
        context.diagnostics.push(
          createDiagnostic({
            code: 'assignment-before-node',
            message: `赋值引用了尚未声明的节点 ${parsedAssignment.assignment.targetId}。`,
            path: parsedAssignment.assignment.rawPath,
            ...parsedAssignment.assignment.location
          })
        )
        continue
      }

      targetNode.assignments.push(parsedAssignment.assignment)
      continue
    }

    context.diagnostics.push(
      createLineDiagnostic('unknown-statement', '无法识别这条 DSL 语句。', 'dsl', cursor, rawLine)
    )
    cursor += 1
  }

  if (stopAtContainerId) {
    context.diagnostics.push(
      createDiagnostic({
        code: 'missing-endsubgraph',
        message: `容器节点 ${stopAtContainerId} 的子图缺少 ENDSUBGRAPH。`,
        path: `nodes.${stopAtContainerId}.subgraph`,
        line: context.lines.length,
        column: 1,
        endLine: context.lines.length,
        endColumn: context.lines[context.lines.length - 1]?.length || 1
      })
    )
  }

  return {
    graph: { nodes: state.nodes, edges: state.edges },
    workflowAssignments,
    nextLineIndex: context.lines.length
  }
}

function parseAssignmentAst(
  lines: string[],
  lineIndex: number,
  rawLine: string,
  diagnostics: OFBlueprintTextDiagnostic[]
): {
  assignment: OFBlueprintTextAssignmentAst | null
  nextLineIndex: number
} | null {
  const trimmed = rawLine.trim()
  const inlineMatch = trimmed.match(SET_INLINE_PATTERN)
  if (inlineMatch) {
    const [, rawPath, rawValue] = inlineMatch
    const location = createLineLocation(lineIndex, rawLine)
    const pathResult = splitAssignmentPath(rawPath, location)
    if (!pathResult) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-assignment-path',
          message: 'SET 语句路径必须是 workflow.<field> 或 <node-id>.<field>。',
          path: rawPath,
          ...location
        })
      )
      return {
        assignment: null,
        nextLineIndex: lineIndex + 1
      }
    }

    const valueResult = parseInlineValue(rawValue, location)
    if (!valueResult.ok) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-inline-value',
          message: 'SET 语句右侧必须是合法 JSON 字面量、数字、布尔或 null。',
          path: rawPath,
          ...location
        })
      )
      return {
        assignment: createInvalidAssignment(rawPath, pathResult, location),
        nextLineIndex: lineIndex + 1
      }
    }

    return {
      assignment: {
        kind: 'assignment',
        rawPath,
        target: pathResult.target,
        targetId: pathResult.targetId,
        pathSegments: pathResult.pathSegments,
        value: valueResult.value,
        valueKind: 'inline',
        location
      },
      nextLineIndex: lineIndex + 1
    }
  }

  const heredocMatch = trimmed.match(SET_HEREDOC_PATTERN)
  if (heredocMatch) {
    const [, rawPath, terminator] = heredocMatch
    const startLocation = createLineLocation(lineIndex, rawLine)
    const pathResult = splitAssignmentPath(rawPath, startLocation)
    if (!pathResult) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-assignment-path',
          message: 'SET 语句路径必须是 workflow.<field> 或 <node-id>.<field>。',
          path: rawPath,
          ...startLocation
        })
      )
      return {
        assignment: null,
        nextLineIndex: lineIndex + 1
      }
    }

    const contentLines: string[] = []
    let cursor = lineIndex + 1
    while (cursor < lines.length && lines[cursor].trim() !== terminator) {
      contentLines.push(lines[cursor])
      cursor += 1
    }

    if (cursor >= lines.length) {
      diagnostics.push(
        createDiagnostic({
          code: 'unterminated-heredoc',
          message: `多行值缺少结束标记 ${terminator}。`,
          path: rawPath,
          ...startLocation
        })
      )
      return {
        assignment: {
          ...createInvalidAssignment(rawPath, pathResult, {
            line: lineIndex + 1,
            column: 1,
            endLine: lineIndex + 1,
            endColumn: rawLine.length || 1
          }),
          value: '',
          valueKind: terminator === 'JSON' ? 'heredoc-json' : 'heredoc-text'
        },
        nextLineIndex: lines.length
      }
    }

    const valueLocation: OFBlueprintTextLocation = {
      line: lineIndex + 1,
      column: 1,
      endLine: cursor + 1,
      endColumn: lines[cursor].length || 1
    }

    const joinedContent = contentLines.join('\n')
    const parsedValue =
      terminator === 'JSON'
        ? parseJsonValue(joinedContent, valueLocation)
        : {
            ok: true as const,
            value: joinedContent.trimEnd()
          }

    if (!parsedValue.ok) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-heredoc-json',
          message: '<<JSON 块内容必须是合法 JSON。',
          path: rawPath,
          ...valueLocation
        })
      )
    }

    return {
      assignment: parsedValue.ok
        ? {
            kind: 'assignment',
            rawPath,
            target: pathResult.target,
            targetId: pathResult.targetId,
            pathSegments: pathResult.pathSegments,
            value: parsedValue.value,
            valueKind: terminator === 'JSON' ? 'heredoc-json' : 'heredoc-text',
            location: valueLocation
          }
        : {
            ...createInvalidAssignment(rawPath, pathResult, valueLocation),
            value: '',
            valueKind: terminator === 'JSON' ? 'heredoc-json' : 'heredoc-text'
          },
      nextLineIndex: cursor + 1
    }
  }

  return null
}

function compileGraphAst(
  graph: OFBlueprintTextGraphAst,
  context: GraphCompileContext
): {
  nodes: OFBlueprintNode[]
  edges: OFBlueprintWorkflow['edges']
  diagnostics: OFBlueprintTextDiagnostic[]
} {
  const diagnostics: OFBlueprintTextDiagnostic[] = []
  const nodes: OFBlueprintNode[] = []
  const nodeById = new Map<string, { ast: OFBlueprintTextGraphAst['nodes'][number]; node: OFBlueprintNode }>()

  graph.nodes.forEach((nodeAst) => {
    const compiledNode = compileNodeAst(nodeAst, context)
    diagnostics.push(...compiledNode.diagnostics)
    if (!compiledNode.blueprintNode) {
      return
    }
    nodes.push(compiledNode.blueprintNode)
    nodeById.set(nodeAst.id, { ast: nodeAst, node: compiledNode.blueprintNode })
  })

  const edges = graph.edges.flatMap((edgeAst, index) => {
    const source = nodeById.get(edgeAst.fromNodeId)
    const target = nodeById.get(edgeAst.toNodeId)
    if (!source || !target) {
      diagnostics.push(
        createDiagnostic({
          code: 'unknown-edge-node',
          message: '连线引用了不存在的节点。',
          path: `edges[${index}]`,
          ...edgeAst.location
        })
      )
      return []
    }

    if (
      source.node.type === OFBlockEnum.IfElse &&
      (!edgeAst.fromHandle || !edgeAst.fromHandle.trim())
    ) {
      diagnostics.push(
        createDiagnostic({
          code: 'missing-ifelse-handle',
          message: 'IfElse 连线必须显式声明 source handle。',
          path: `edges[${index}].from.handle`,
          ...edgeAst.location
        })
      )
      return []
    }

    return [
      {
        id: `edge_${source.node.id}_${target.node.id}_${index}`,
        from: {
          node: source.node.id,
          handle: edgeAst.fromHandle || 'source'
        },
        to: {
          node: target.node.id,
          handle: edgeAst.toHandle || 'target'
        }
      }
    ]
  })

  return {
    nodes,
    edges,
    diagnostics
  }
}

function compileNodeAst(
  nodeAst: OFBlueprintTextGraphAst['nodes'][number],
  context: GraphCompileContext
): NodeCompileResult {
  const diagnostics: OFBlueprintTextDiagnostic[] = []

  let definition:
    | ReturnType<typeof resolveOFNodeDefinition>
    | null = null
  try {
    definition = resolveOFNodeDefinition(nodeAst.type as OFBlockEnum)
  } catch {
    diagnostics.push(
      createDiagnostic({
        code: 'unknown-node-type',
        message: `未知节点类型：${nodeAst.type}。`,
        path: `nodes.${nodeAst.id}.type`,
        ...nodeAst.location
      })
    )
    return { blueprintNode: null, diagnostics }
  }

  if (definition.meta.internal || !definition.meta.ai_exposed) {
    diagnostics.push(
      createDiagnostic({
        code: 'forbidden-node-type',
        message: `节点类型 ${nodeAst.type} 不是可作者态生成的公开节点。`,
        path: `nodes.${nodeAst.id}.type`,
        ...nodeAst.location
      })
    )
    return { blueprintNode: null, diagnostics }
  }

  if (!context.allowContainers && definition.meta.kind === 'container') {
    diagnostics.push(
      createDiagnostic({
        code: 'nested-container-not-supported',
        message: '当前子图内禁止继续声明 iteration / loop 容器节点。',
        path: `nodes.${nodeAst.id}`,
        ...nodeAst.location
      })
    )
  }

  const blueprintNode: OFBlueprintNode = {
    id: nodeAst.id,
    type: definition.meta.type,
    config: {}
  }

  nodeAst.assignments.forEach((assignment) => {
    applyNodeAssignment(blueprintNode, assignment, diagnostics)
  })

  const requiredFields = definition.authoring.contract.author_required_fields
  requiredFields.forEach((fieldPath) => {
    if (!hasAuthoringFieldValue(blueprintNode, fieldPath)) {
      diagnostics.push(
        createDiagnostic({
          code: 'missing-required-field',
          message: `节点 ${nodeAst.id} 缺少必填字段 ${fieldPath}。`,
          path: `nodes.${nodeAst.id}.${fieldPath}`,
          ...nodeAst.location
        })
      )
    }
  })

  if (nodeAst.subgraph) {
    if (definition.meta.kind !== 'container') {
      diagnostics.push(
        createDiagnostic({
          code: 'subgraph-on-non-container',
          message: `节点 ${nodeAst.id} 不是容器节点，不能声明子图。`,
          path: `nodes.${nodeAst.id}.subgraph`,
          ...nodeAst.location
        })
      )
    } else {
      const subgraphResult = compileGraphAst(nodeAst.subgraph, {
        graphLabel: `nodes.${nodeAst.id}.subgraph`,
        allowContainers: false
      })
      diagnostics.push(...subgraphResult.diagnostics)
      blueprintNode.subgraph = {
        nodes: subgraphResult.nodes,
        edges: subgraphResult.edges
      }
    }
  }

  return {
    blueprintNode,
    diagnostics
  }
}

function applyWorkflowAssignment(
  workflowMeta: OFBlueprintWorkflow['workflow'],
  assignment: OFBlueprintTextAssignmentAst,
  diagnostics: OFBlueprintTextDiagnostic[]
): void {
  if (assignment.pathSegments.length !== 1 || typeof assignment.pathSegments[0] !== 'string') {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-workflow-path',
        message: 'workflow 只允许设置 name / description / author。',
        path: assignment.rawPath,
        ...assignment.location
      })
    )
    return
  }

  const field = assignment.pathSegments[0]
  if (!['name', 'description', 'author'].includes(field)) {
    diagnostics.push(
      createDiagnostic({
        code: 'unsupported-workflow-field',
        message: `workflow.${field} 不是支持的字段。`,
        path: assignment.rawPath,
        ...assignment.location
      })
    )
    return
  }

  if (typeof assignment.value !== 'string') {
    diagnostics.push(
      createDiagnostic({
        code: 'workflow-string-required',
        message: `workflow.${field} 必须是字符串。`,
        path: assignment.rawPath,
        ...assignment.location
      })
    )
    return
  }

  workflowMeta[field as 'name' | 'description' | 'author'] = assignment.value
}

function applyNodeAssignment(
  blueprintNode: OFBlueprintNode,
  assignment: OFBlueprintTextAssignmentAst,
  diagnostics: OFBlueprintTextDiagnostic[]
): void {
  const [firstSegment, ...restSegments] = assignment.pathSegments
  if (typeof firstSegment !== 'string') {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-node-path',
        message: '节点赋值路径缺少字段名。',
        path: assignment.rawPath,
        ...assignment.location
      })
    )
    return
  }

  if (firstSegment === 'title' || firstSegment === 'description') {
    if (restSegments.length > 0 || typeof assignment.value !== 'string') {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-node-meta-assignment',
          message: `${firstSegment} 只能被设置为字符串。`,
          path: assignment.rawPath,
          ...assignment.location
        })
      )
      return
    }
    blueprintNode[firstSegment] = assignment.value
    return
  }

  const configPath =
    firstSegment === 'data' || firstSegment === 'config'
      ? restSegments
      : assignment.pathSegments

  if (configPath.length === 0) {
    diagnostics.push(
      createDiagnostic({
        code: 'empty-config-path',
        message: '节点配置路径不能为空。',
        path: assignment.rawPath,
        ...assignment.location
      })
    )
    return
  }

  applyAssignmentIntoTarget(blueprintNode.config, configPath, assignment.value, assignment, diagnostics)
}

function applyAssignmentIntoTarget(
  target: Record<string, unknown>,
  pathSegments: OFBlueprintTextPathSegment[],
  value: OFBlueprintTextValue,
  assignment: OFBlueprintTextAssignmentAst,
  diagnostics: OFBlueprintTextDiagnostic[]
): void {
  let current: unknown = target

  for (let index = 0; index < pathSegments.length; index += 1) {
    const segment = pathSegments[index]
    const isLast = index === pathSegments.length - 1
    const nextSegment = pathSegments[index + 1]

    if (typeof segment === 'string') {
      if (!isPlainObject(current)) {
        diagnostics.push(
          createDiagnostic({
            code: 'path-not-object',
            message: `路径 ${assignment.rawPath} 在 ${segment} 处不是对象。`,
            path: assignment.rawPath,
            ...assignment.location
          })
        )
        return
      }

      if (isLast) {
        current[segment] = value
        return
      }

      if (!(segment in current) || current[segment] === undefined) {
        current[segment] = typeof nextSegment === 'number' ? [] : {}
      }
      current = current[segment]
      continue
    }

    if (!Array.isArray(current)) {
      diagnostics.push(
        createDiagnostic({
          code: 'path-not-array',
          message: `路径 ${assignment.rawPath} 在下标 ${segment} 处不是数组。`,
          path: assignment.rawPath,
          ...assignment.location
        })
      )
      return
    }

    if (segment > current.length) {
      diagnostics.push(
        createDiagnostic({
          code: 'sparse-array-index',
          message: `路径 ${assignment.rawPath} 出现跳号数组下标 ${segment}。`,
          path: assignment.rawPath,
          ...assignment.location
        })
      )
      return
    }

    if (segment === current.length) {
      current.push(isLast ? value : typeof nextSegment === 'number' ? [] : {})
    }

    if (isLast) {
      current[segment] = value
      return
    }

    if (current[segment] === undefined || current[segment] === null) {
      current[segment] = typeof nextSegment === 'number' ? [] : {}
    }
    current = current[segment]
  }
}

function hasAuthoringFieldValue(node: OFBlueprintNode, authoringPath: string): boolean {
  const normalizedPath = authoringPath.startsWith('data.')
    ? ['config', ...parsePathSegments(authoringPath.slice(5))]
    : parsePathSegments(authoringPath)

  let current: unknown = {
    id: node.id,
    type: node.type,
    title: node.title,
    description: node.description,
    config: node.config
  }

  for (const segment of normalizedPath) {
    if (typeof segment === 'string') {
      if (!isPlainObject(current) || !(segment in current)) {
        return false
      }
      current = current[segment]
      continue
    }

    if (!Array.isArray(current) || segment >= current.length) {
      return false
    }
    current = current[segment]
  }

  if (Array.isArray(current)) {
    return current.length > 0
  }
  if (isPlainObject(current)) {
    return Object.keys(current).length > 0
  }
  if (typeof current === 'string') {
    return current.trim().length > 0
  }
  return current !== undefined && current !== null
}

function mapBlueprintValidationIssues(
  issues: OFBlueprintValidationIssue[],
  ast: OFBlueprintTextAst
): OFBlueprintTextDiagnostic[] {
  return issues.map((issue) => {
    const location = resolveIssueLocation(issue.path, ast)
    return createDiagnostic({
      code: 'blueprint-validation',
      message: issue.message,
      path: issue.path,
      ...location
    })
  })
}

function tryCompileRunnable(
  blueprint: OFBlueprintWorkflow,
  ast: OFBlueprintTextAst,
  diagnostics: OFBlueprintTextDiagnostic[]
): OFRunnableWorkflow | null {
  try {
    return compileOFBlueprintToRunnable(blueprint)
  } catch (error) {
    diagnostics.push(
      createDiagnostic({
        code: 'runnable-compile-failed',
        message: error instanceof Error ? error.message : '无法编译为 runnable workflow。',
        path: 'workflow',
        ...resolveIssueLocation('workflow', ast)
      })
    )
    return null
  }
}

function splitAssignmentPath(
  rawPath: string,
  location: OFBlueprintTextLocation
): {
  target: 'workflow' | 'node'
  targetId: string | null
  pathSegments: OFBlueprintTextPathSegment[]
} | null {
  const rootDotIndex = rawPath.indexOf('.')
  if (rootDotIndex < 0) {
    return null
  }

  const rootSegment = rawPath.slice(0, rootDotIndex)
  const remainder = rawPath.slice(rootDotIndex + 1)
  if (!remainder.trim()) {
    return null
  }

  return {
    target: rootSegment === 'workflow' ? 'workflow' : 'node',
    targetId: rootSegment === 'workflow' ? null : rootSegment,
    pathSegments: parsePathSegments(remainder),
    location
  }
}

function parsePathSegments(path: string): OFBlueprintTextPathSegment[] {
  const segments: OFBlueprintTextPathSegment[] = []
  let buffer = ''

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index]

    if (char === '.') {
      if (buffer) {
        segments.push(buffer)
        buffer = ''
      }
      continue
    }

    if (char === '[') {
      if (buffer) {
        segments.push(buffer)
        buffer = ''
      }
      const closeIndex = path.indexOf(']', index)
      if (closeIndex < 0) {
        break
      }
      const indexText = path.slice(index + 1, closeIndex).trim()
      segments.push(Number(indexText))
      index = closeIndex
      continue
    }

    buffer += char
  }

  if (buffer) {
    segments.push(buffer)
  }

  return segments
}

function parseInlineValue(
  rawValue: string,
  location: OFBlueprintTextLocation
): { ok: true; value: OFBlueprintTextValue } | { ok: false } {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return { ok: false }
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return {
      ok: true,
      value: Number(trimmed)
    }
  }

  if (trimmed === 'true') {
    return { ok: true, value: true }
  }
  if (trimmed === 'false') {
    return { ok: true, value: false }
  }
  if (trimmed === 'null') {
    return { ok: true, value: null }
  }

  return parseJsonValue(trimmed, location)
}

function parseJsonValue(
  rawJson: string,
  _location: OFBlueprintTextLocation
): { ok: true; value: OFBlueprintTextValue } | { ok: false } {
  try {
    return {
      ok: true,
      value: JSON.parse(rawJson) as OFBlueprintTextValue
    }
  } catch {
    return { ok: false }
  }
}

function findFirstMeaningfulLine(lines: string[]): number {
  return lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
}

function resolveIssueLocation(path: string, ast: OFBlueprintTextAst): OFBlueprintTextLocation {
  if (path.startsWith('workflow')) {
    return ast.workflowAssignments[0]?.location || createDefaultLocation()
  }

  const rootNodeMatch = path.match(/^nodes\.(.+?)(?:\.|$)/)
  if (rootNodeMatch) {
    const node = ast.graph.nodes.find((item) => item.id === rootNodeMatch[1])
    return node?.location || createDefaultLocation()
  }

  const indexedNodeMatch = path.match(/^nodes\[(\d+)\]/)
  if (indexedNodeMatch) {
    const node = ast.graph.nodes[Number(indexedNodeMatch[1])]
    return node?.location || createDefaultLocation()
  }

  const indexedEdgeMatch = path.match(/^edges\[(\d+)\]/)
  if (indexedEdgeMatch) {
    const edge = ast.graph.edges[Number(indexedEdgeMatch[1])]
    return edge?.location || createDefaultLocation()
  }

  return createDefaultLocation()
}

function createInvalidAssignment(
  rawPath: string,
  pathResult: { target: 'workflow' | 'node'; targetId: string | null; pathSegments: OFBlueprintTextPathSegment[] },
  location: OFBlueprintTextLocation
): OFBlueprintTextAssignmentAst {
  return {
    kind: 'assignment',
    rawPath,
    target: pathResult.target,
    targetId: pathResult.targetId,
    pathSegments: pathResult.pathSegments,
    value: '',
    valueKind: 'inline',
    location
  }
}

function createDiagnostic(input: OFBlueprintTextDiagnostic): OFBlueprintTextDiagnostic {
  return {
    severity: 'error',
    ...input
  }
}

function createLineDiagnostic(
  code: string,
  message: string,
  path: string,
  lineIndex: number,
  rawLine: string
): OFBlueprintTextDiagnostic {
  return createDiagnostic({
    code,
    message,
    path,
    line: lineIndex + 1,
    column: 1,
    endLine: lineIndex + 1,
    endColumn: rawLine.length || 1,
    context: rawLine.trim()
  })
}

function createLineLocation(lineIndex: number, rawLine: string): OFBlueprintTextLocation {
  return {
    line: lineIndex + 1,
    column: 1,
    endLine: lineIndex + 1,
    endColumn: rawLine.length || 1
  }
}

function createDefaultLocation(): OFBlueprintTextLocation {
  return {
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
