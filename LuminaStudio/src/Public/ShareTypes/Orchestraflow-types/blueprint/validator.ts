import type { OFRunnableEdge, OFRunnableSubgraphNode, OFRunnableWorkflow } from '../contract'
import type { OFBlueprintNode, OFBlueprintValidationResult, OFBlueprintWorkflow } from './types'
import {
  OFBlockEnum,
  getOFEdgeSourcePortId,
  getOFEdgeTargetPortId,
  type OFIfElseCase
} from '../core-types'
import { resolveOFNodeDefinition } from '../node-definition-registry'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'

export const OF_BLUEPRINT_REQUIRED_WORKFLOW_FIELDS = ['workflow.name'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${path} 必须是对象`)
  }
  return value
}

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${path} 必须是非空字符串`)
  }
  return value
}

function assertNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${path} 必须是数字`)
  }
  return value
}

function assertStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} 必须是至少 1 段的字符串数组`)
  }
  return value.map((item, index) => assertNonEmptyString(item, `${path}[${index}]`))
}

function assertSelectorRef(value: unknown, path: string): void {
  const ref = assertRecord(value, path)
  assertStringArray(ref.selector, `${path}.selector`)
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : []
}

function assertAllowedScalarDefault(value: unknown, path: string): void {
  if (
    value !== null &&
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    throw new Error(`${path} 只能是 string | number | boolean | null`)
  }
}

function assertAllowedObjectDefault(value: unknown, path: string): void {
  if (value !== null && !isRecord(value)) {
    throw new Error(`${path} 只能是对象或 null`)
  }
}

function validateJsonSchemaProperty(value: unknown, path: string): void {
  const schema = assertRecord(value, path)
  const type = assertNonEmptyString(schema.type, `${path}.type`)

  if (type === 'object') {
    const properties = assertRecord(schema.properties, `${path}.properties`)
    if (Object.keys(properties).length === 0) {
      throw new Error(`${path}.properties 不能为空`)
    }
    if (!Array.isArray(schema.required)) {
      throw new Error(`${path}.required 必须是数组`)
    }
    if (schema.additionalProperties !== false) {
      throw new Error(`${path}.additionalProperties 必须等于 false`)
    }
    if ('default' in schema) {
      assertAllowedObjectDefault(schema.default, `${path}.default`)
    }
    Object.entries(properties).forEach(([key, child]) => {
      validateJsonSchemaProperty(child, `${path}.properties.${key}`)
    })
    return
  }

  if (type === 'array') {
    validateJsonSchemaProperty(schema.items, `${path}.items`)
    if (
      'default' in schema &&
      schema.default !== undefined &&
      !Array.isArray(schema.default) &&
      schema.default !== null
    ) {
      throw new Error(`${path}.default 必须是数组或 null`)
    }
    return
  }

  if (!['string', 'number', 'boolean'].includes(type)) {
    throw new Error(`${path}.type 仅支持 string | number | boolean | object | array`)
  }

  if ('default' in schema) {
    assertAllowedScalarDefault(schema.default, `${path}.default`)
  }
}

function validateStructuredVariable(item: Record<string, unknown>, path: string): void {
  const type = item.type
  if (type === 'array') {
    if ('default' in item && item.default !== undefined) {
      throw new Error(`${path}.default 不允许直接写在 array 变量上，默认值应写入 schema`)
    }
    const schema = toRecord(item.schema)
    validateJsonSchemaProperty(schema, `${path}.schema`)
    if (schema?.type !== 'array') {
      throw new Error(`${path}.schema.type 必须与变量 type=array 保持一致`)
    }
    return
  }

  if (type !== 'object') {
    return
  }

  if ('default' in item && item.default !== undefined) {
    throw new Error(`${path}.default 不允许直接写在 object 变量上，默认值应写入 schema`)
  }

  const schema = toRecord(item.schema)
  validateJsonSchemaProperty(schema, `${path}.schema`)

  const schemaType = schema?.type
  if (schemaType !== 'object') {
    throw new Error(`${path}.schema.type 必须与变量 type=object 保持一致`)
  }
}

function validateVariableList(items: unknown, path: string): void {
  if (!Array.isArray(items)) {
    return
  }

  items.forEach((item, index) => {
    const variable = assertRecord(item, `${path}[${index}]`)
    validateStructuredVariable(variable, `${path}[${index}]`)
  })
}

function getNodeDisplayType(node: Record<string, unknown>, path: string): OFBlockEnum {
  const nodeType = assertNonEmptyString(node.type, `${path}.type`) as OFBlockEnum
  const data = assertRecord(node.data, `${path}.data`)
  const dataType = assertNonEmptyString(data.type, `${path}.data.type`)
  if (nodeType !== dataType) {
    throw new Error(`${path}.type 与 ${path}.data.type 必须一致`)
  }
  return nodeType
}

function listControlHandles(nodeType: OFBlockEnum, direction: 'input' | 'output'): string[] {
  try {
    return resolveOFNodeDefinition(nodeType)
      .runtime.ports.filter((port) => port.channel === 'control' && port.direction === direction)
      .map((port) => port.id)
  } catch {
    return []
  }
}

function collectBlueprintIfElseSourceHandles(node: Record<string, unknown>): string[] {
  const config = isRecord(node.config) ? node.config : {}
  const cases = Array.isArray(config.cases) ? config.cases : []
  const handles = cases
    .map((item) => {
      if (!isRecord(item) || typeof item.handleId !== 'string') {
        return null
      }
      const handleId = item.handleId.trim()
      return handleId || null
    })
    .filter((item): item is string => Boolean(item))

  if (isRecord(config.elseCase) && typeof config.elseCase.handleId === 'string') {
    const elseHandleId = config.elseCase.handleId.trim()
    if (elseHandleId) {
      handles.push(elseHandleId)
    }
  }

  return handles
}

function formatAllowedHandles(handles: string[]): string {
  return handles.length ? handles.join(', ') : '(none)'
}

function validateBlueprintEdgeHandles(
  edge: Record<string, unknown>,
  edgePath: string,
  nodeMap: Map<string, Record<string, unknown>>,
  issues: OFBlueprintValidationResult['issues']
): void {
  if (!isRecord(edge.from) || !isRecord(edge.to)) {
    issues.push({
      level: 'error',
      path: edgePath,
      message: '连线必须包含对象结构的 from / to。'
    })
    return
  }

  const sourceNodeId = typeof edge.from.node === 'string' ? edge.from.node.trim() : ''
  const targetNodeId = typeof edge.to.node === 'string' ? edge.to.node.trim() : ''
  const sourceHandle = typeof edge.from.handle === 'string' ? edge.from.handle.trim() : ''
  const targetHandle = typeof edge.to.handle === 'string' ? edge.to.handle.trim() : ''

  if (!sourceNodeId || !targetNodeId || !sourceHandle || !targetHandle) {
    return
  }

  const sourceNode = nodeMap.get(sourceNodeId)
  const targetNode = nodeMap.get(targetNodeId)
  if (!sourceNode || !targetNode) {
    return
  }

  const sourceType = sourceNode.type as OFBlockEnum
  const targetType = targetNode.type as OFBlockEnum
  const allowedTargetHandles = listControlHandles(targetType, 'input')
  if (!allowedTargetHandles.includes(targetHandle)) {
    issues.push({
      level: 'error',
      path: `${edgePath}.to.handle`,
      message: `节点 ${targetNodeId}(${targetType}) 只允许控制流入边 handle: ${formatAllowedHandles(allowedTargetHandles)}。`
    })
  }

  const allowedSourceHandles =
    sourceType === OFBlockEnum.IfElse
      ? collectBlueprintIfElseSourceHandles(sourceNode)
      : listControlHandles(sourceType, 'output')
  if (!allowedSourceHandles.includes(sourceHandle)) {
    issues.push({
      level: 'error',
      path: `${edgePath}.from.handle`,
      message:
        sourceType === OFBlockEnum.IfElse
          ? `IfElse 节点 ${sourceNodeId} 的出边 handle 必须匹配 case.handleId 或 elseCase.handleId；当前可用: ${formatAllowedHandles(allowedSourceHandles)}。`
          : `节点 ${sourceNodeId}(${sourceType}) 只允许控制流出边 handle: ${formatAllowedHandles(allowedSourceHandles)}。`
    })
  }
}

function validateSelectorFields(
  nodeType: OFBlockEnum,
  data: Record<string, unknown>,
  path: string
): void {
  switch (nodeType) {
    case OFBlockEnum.Start: {
      const input = toRecord(data.input)
      const variables = toRecordArray(input?.variables)
      validateVariableList(variables, `${path}.input.variables`)
      variables.forEach((item, index) => {
        if (item.value_ref) {
          assertSelectorRef(item.value_ref, `${path}.input.variables[${index}].value_ref`)
        }
      })
      return
    }
    case OFBlockEnum.IfElse:
      toCaseList(data.cases).forEach((item, index) => {
        toConditionRecordList(item.conditions).forEach((condition, conditionIndex) => {
          assertSelectorRef(
            condition.variable_ref,
            `${path}.cases[${index}].conditions[${conditionIndex}].variable_ref`
          )
          if (condition.compare_source_mode === 'variable') {
            assertSelectorRef(
              condition.compare_ref,
              `${path}.cases[${index}].conditions[${conditionIndex}].compare_ref`
            )
          }
        })
      })
      return
    case OFBlockEnum.Iteration:
      assertSelectorRef(data.iterator_ref, `${path}.iterator_ref`)
      if (data.output_ref) {
        assertSelectorRef(data.output_ref, `${path}.output_ref`)
      }
      toRecordArray(data.branch_output_refs).forEach((item, index) => {
        assertNonEmptyString(
          item.source_handle_id,
          `${path}.branch_output_refs[${index}].source_handle_id`
        )
        assertSelectorRef(item.output_ref, `${path}.branch_output_refs[${index}].output_ref`)
      })
      return
    case OFBlockEnum.Loop:
      validateVariableList(data.loop_variables, `${path}.loop_variables`)
      toRecordArray(data.loop_variables).forEach((item, index) => {
        const valueSource = toRecord(item.value_source)
        if (valueSource?.mode === 'variable') {
          assertSelectorRef(valueSource.ref, `${path}.loop_variables[${index}].value_source.ref`)
        }
      })
      toConditionRecordList(data.break_conditions).forEach((condition, index) => {
        assertSelectorRef(condition.variable_ref, `${path}.break_conditions[${index}].variable_ref`)
      })
      return
    case OFBlockEnum.VariableAssign:
      validateVariableList(data.rules, `${path}.rules`)
      toRecordArray(data.rules).forEach((rule, index) => {
        if (toRecord(rule.source)?.mode === 'variable') {
          assertSelectorRef(toRecord(rule.source)?.ref, `${path}.rules[${index}].source.ref`)
        }
      })
      return
    case OFBlockEnum.End: {
      const output = toRecord(data.output)
      const variables = toRecordArray(output?.variables)
      validateVariableList(variables, `${path}.output.variables`)
      variables.forEach((item, index) => {
        if (item.value_ref !== undefined) {
          assertSelectorRef(item.value_ref, `${path}.output.variables[${index}].value_ref`)
        }
      })
      return
    }
    default:
      return
  }
}

function toCaseList(value: unknown): OFIfElseCase[] {
  return Array.isArray(value) ? (value as OFIfElseCase[]) : []
}

function toConditionRecordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : []
}

function validateEdgeHandles(
  edge: Record<string, unknown>,
  edgePath: string,
  nodeMap: Map<string, Record<string, unknown>>
): OFRunnableEdge {
  const source = assertNonEmptyString(edge.source, `${edgePath}.source`)
  assertNonEmptyString(edge.target, `${edgePath}.target`)
  const sourceHandle = assertNonEmptyString(getOFEdgeSourcePortId(edge), `${edgePath}.sourceHandle`)
  const targetHandle = assertNonEmptyString(getOFEdgeTargetPortId(edge), `${edgePath}.targetHandle`)

  const sourceNode = nodeMap.get(source)
  const sourceType = sourceNode
    ? getNodeDisplayType(sourceNode, `${edgePath}.sourceNode`)
    : undefined
  if (targetHandle !== 'target') {
    throw new Error(`${edgePath}.targetHandle 必须等于 target`)
  }
  if (sourceType === OFBlockEnum.IfElse) {
    const sourceNodeData = toRecord(sourceNode?.data)
    const cases = toCaseList(sourceNodeData?.cases)
    const elseHandle = toRecord(sourceNodeData?.elseCase)?.handleId
    const allowed = new Set([...cases.map((item) => item.handleId), elseHandle].filter(Boolean))
    if (!allowed.has(sourceHandle)) {
      throw new Error(
        `${edgePath}.sourceHandle 必须匹配 IfElse 的 case.handleId 或 elseCase.handleId`
      )
    }
  } else if (sourceHandle !== 'source') {
    throw new Error(`${edgePath}.sourceHandle 必须等于 source`)
  }

  return edge as OFRunnableEdge
}

function validateSubgraph(
  parentNodeId: string,
  expectedStartType: OFBlockEnum.IterationStart | OFBlockEnum.LoopStart,
  startNodeId: string,
  graph: Record<string, unknown>,
  path: string
): void {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph.edges) ? graph.edges : []
  const viewport = assertRecord(graph.viewport, `${path}.viewport`)
  assertNumber(viewport.x, `${path}.viewport.x`)
  assertNumber(viewport.y, `${path}.viewport.y`)
  assertNumber(viewport.zoom, `${path}.viewport.zoom`)

  const nodeMap = new Map<string, Record<string, unknown>>()
  const startNodes: OFRunnableSubgraphNode[] = []

  nodes.forEach((node, index) => {
    const nodePath = `${path}.nodes[${index}]`
    const record = assertRecord(node, nodePath)
    const nodeId = assertNonEmptyString(record.id, `${nodePath}.id`)
    assertNonEmptyString(record.parentNode, `${nodePath}.parentNode`)
    if (record.parentNode !== parentNodeId) {
      throw new Error(`${nodePath}.parentNode 必须等于容器节点 id`)
    }
    if (record.extent !== 'parent') {
      throw new Error(`${nodePath}.extent 必须等于 parent`)
    }
    const nodeType = getNodeDisplayType(record, nodePath)
    if (nodeType === OFBlockEnum.Iteration || nodeType === OFBlockEnum.Loop) {
      throw new Error(`${nodePath} 子图内禁止再嵌套容器节点`)
    }
    validateSelectorFields(
      nodeType,
      assertRecord(record.data, `${nodePath}.data`),
      `${nodePath}.data`
    )
    nodeMap.set(nodeId, record)
    if (nodeType === expectedStartType) {
      startNodes.push(record as OFRunnableSubgraphNode)
    }
  })

  if (startNodes.length !== 1) {
    throw new Error(`${path} 必须且只能包含一个 ${expectedStartType} 节点`)
  }
  if (startNodes[0].id !== startNodeId) {
    throw new Error(`${path} 的 start_node_id 必须指向唯一的 ${expectedStartType} 节点`)
  }

  edges.forEach((edge, index) =>
    validateEdgeHandles(
      assertRecord(edge, `${path}.edges[${index}]`),
      `${path}.edges[${index}]`,
      nodeMap
    )
  )
}

export function assertOFRunnableWorkflow(value: unknown): OFRunnableWorkflow {
  const workflow = assertRecord(value, 'workflow')
  assertNonEmptyString(workflow.id, 'workflow.id')
  assertNonEmptyString(workflow.name, 'workflow.name')
  assertNonEmptyString(workflow.author, 'workflow.author')
  assertNumber(workflow.createdAt, 'workflow.createdAt')
  assertNumber(workflow.updatedAt, 'workflow.updatedAt')
  if (!['draft', 'published', 'archived'].includes(String(workflow.status))) {
    throw new Error('workflow.status 必须是 draft | published | archived')
  }

  const graph = assertRecord(workflow.graph, 'workflow.graph')
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph.edges) ? graph.edges : []
  if (nodes.length === 0) {
    throw new Error('workflow.graph.nodes 不能为空')
  }

  const selectorVariableRoots = collectOFSelectorVariableRoots(nodes)
  const nodeMap = new Map<string, Record<string, unknown>>()
  nodes.forEach((node, index) => {
    const path = `workflow.graph.nodes[${index}]`
    const record = assertRecord(node, path)
    const nodeId = assertNonEmptyString(record.id, `${path}.id`)
    const nodeType = getNodeDisplayType(record, path)
    if (nodeType === OFBlockEnum.IterationStart || nodeType === OFBlockEnum.LoopStart) {
      throw new Error(`${path} 根图禁止出现内部 start 节点`)
    }
    if (record.parentNode !== undefined || record.extent !== undefined) {
      throw new Error(`${path} 根图节点不能带 parentNode 或 extent`)
    }
    const data = assertRecord(record.data, `${path}.data`)
    normalizeOFRunnableNodeSelectorData(nodeType, data, selectorVariableRoots)
    validateSelectorFields(nodeType, data, `${path}.data`)

    if (nodeType === OFBlockEnum.Iteration || nodeType === OFBlockEnum.Loop) {
      const subgraph = assertRecord(data.subgraph, `${path}.data.subgraph`)
      const startNodeId = assertNonEmptyString(data.start_node_id, `${path}.data.start_node_id`)
      validateSubgraph(
        nodeId,
        nodeType === OFBlockEnum.Iteration ? OFBlockEnum.IterationStart : OFBlockEnum.LoopStart,
        startNodeId,
        subgraph,
        `${path}.data.subgraph`
      )
    }

    nodeMap.set(nodeId, record)
  })

  edges.forEach((edge, index) =>
    validateEdgeHandles(
      assertRecord(edge, `workflow.graph.edges[${index}]`),
      `workflow.graph.edges[${index}]`,
      nodeMap
    )
  )

  return workflow as OFRunnableWorkflow
}

export function validateOFRunnableWorkflow(value: unknown): OFRunnableWorkflow {
  return assertOFRunnableWorkflow(value)
}

function validateBlueprintNode(
  node: OFBlueprintNode,
  path: string,
  issues: OFBlueprintValidationResult['issues'],
  allowContainers: boolean
): void {
  if (!node.id.trim()) {
    issues.push({ level: 'error', path: `${path}.id`, message: '节点 id 不能为空' })
  }
  if (!allowContainers && (node.type === OFBlockEnum.Iteration || node.type === OFBlockEnum.Loop)) {
    issues.push({
      level: 'error',
      path: `${path}.type`,
      message: '子图内禁止继续嵌套 iteration 或 loop'
    })
  }
  if (node.subgraph) {
    validateOFBlueprintSubgraph(node.subgraph, `${path}.subgraph`, issues, false)
  }
}

function validateOFBlueprintSubgraph(
  subgraph: NonNullable<OFBlueprintNode['subgraph']>,
  path: string,
  issues: OFBlueprintValidationResult['issues'],
  allowContainers: boolean
): void {
  const ids = new Set<string>()
  const nodeMap = new Map<string, Record<string, unknown>>()
  subgraph.nodes.forEach((node, index) => {
    if (ids.has(String(node.id))) {
      issues.push({
        level: 'error',
        path: `${path}.nodes[${index}].id`,
        message: '子图节点 id 不能重复'
      })
    }
    ids.add(String(node.id))
    nodeMap.set(node.id, node as unknown as Record<string, unknown>)
    validateBlueprintNode(node, `${path}.nodes[${index}]`, issues, allowContainers)
  })
  subgraph.edges.forEach((edge, index) => {
    const from = toRecord(edge.from)
    const to = toRecord(edge.to)
    if (!from?.handle || !to?.handle) {
      issues.push({
        level: 'error',
        path: `${path}.edges[${index}]`,
        message: 'Blueprint edge 必须显式声明 from.handle 与 to.handle'
      })
    }
    if (!ids.has(String(from?.node || '')) || !ids.has(String(to?.node || ''))) {
      issues.push({
        level: 'error',
        path: `${path}.edges[${index}]`,
        message: 'Blueprint edge 引用了不存在的子图节点'
      })
    }
    validateBlueprintEdgeHandles(
      edge as unknown as Record<string, unknown>,
      `${path}.edges[${index}]`,
      nodeMap,
      issues
    )
  })
}

export function validateOFBlueprint(value: unknown): OFBlueprintValidationResult {
  const issues: OFBlueprintValidationResult['issues'] = []
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ level: 'error', path: 'workflow', message: 'Blueprint 必须是对象' }]
    }
  }

  if (value.version !== '2.0') {
    issues.push({ level: 'error', path: 'version', message: 'Blueprint version 必须等于 2.0' })
  }
  if (
    !isRecord(value.workflow) ||
    typeof value.workflow.name !== 'string' ||
    !value.workflow.name.trim()
  ) {
    issues.push({
      level: 'error',
      path: 'workflow.name',
      message: 'workflow.name 必须是非空字符串'
    })
  }
  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    issues.push({ level: 'error', path: 'nodes', message: 'Blueprint nodes 不能为空' })
  }
  if (!Array.isArray(value.edges)) {
    issues.push({ level: 'error', path: 'edges', message: 'Blueprint edges 必须是数组' })
  }

  const rootNodes = Array.isArray(value.nodes) ? value.nodes : []
  const rootEdges = Array.isArray(value.edges) ? value.edges : []
  const ids = new Set<string>()
  const nodeMap = new Map<string, Record<string, unknown>>()
  rootNodes.forEach((node, index) => {
    if (!isRecord(node)) {
      issues.push({ level: 'error', path: `nodes[${index}]`, message: '节点必须是对象' })
      return
    }
    const nodeId = typeof node.id === 'string' ? node.id : ''
    if (ids.has(nodeId)) {
      issues.push({ level: 'error', path: `nodes[${index}].id`, message: '根图节点 id 不能重复' })
    }
    ids.add(nodeId)
    nodeMap.set(nodeId, node)
    validateBlueprintNode(node as unknown as OFBlueprintNode, `nodes[${index}]`, issues, true)
  })
  rootEdges.forEach((edge, index) => {
    if (!isRecord(edge)) {
      issues.push({ level: 'error', path: `edges[${index}]`, message: '连线必须是对象' })
      return
    }
    const from = toRecord(edge.from)
    const to = toRecord(edge.to)
    if (!from || !to) {
      issues.push({ level: 'error', path: `edges[${index}]`, message: '连线必须包含 from / to' })
      return
    }
    if (!from.handle || !to.handle) {
      issues.push({
        level: 'error',
        path: `edges[${index}]`,
        message: 'Blueprint edge 必须显式声明 from.handle 与 to.handle'
      })
    }
    if (!ids.has(String(from.node || '')) || !ids.has(String(to.node || ''))) {
      issues.push({
        level: 'error',
        path: `edges[${index}]`,
        message: 'Blueprint edge 引用了不存在的根图节点'
      })
    }
    validateBlueprintEdgeHandles(edge, `edges[${index}]`, nodeMap, issues)
  })

  return {
    valid: issues.length === 0,
    issues
  }
}

export function assertOFBlueprint(value: unknown): OFBlueprintWorkflow {
  const result = validateOFBlueprint(value)
  if (!result.valid) {
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  }
  return value as OFBlueprintWorkflow
}
