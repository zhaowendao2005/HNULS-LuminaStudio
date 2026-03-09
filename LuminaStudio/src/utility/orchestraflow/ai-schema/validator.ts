import type {
  OFIfElseCase,
  OFRunnableEdge,
  OFRunnableSubgraphNode,
  OFRunnableWorkflow
} from '../../../Public/ShareTypes/Orchestraflow-types'
import { OFBlockEnum } from '../../../Public/ShareTypes/Orchestraflow-types'

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertRecord(value: unknown, path: string): Record<string, any> {
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

function getNodeDisplayType(node: Record<string, any>, path: string): OFBlockEnum {
  const nodeType = assertNonEmptyString(node.type, `${path}.type`) as OFBlockEnum
  const data = assertRecord(node.data, `${path}.data`)
  const dataType = assertNonEmptyString(data.type, `${path}.data.type`)
  if (nodeType !== dataType) {
    throw new Error(`${path}.type 与 ${path}.data.type 必须一致`)
  }
  return nodeType
}

function validateSelectorFields(
  nodeType: OFBlockEnum,
  data: Record<string, any>,
  path: string
): void {
  switch (nodeType) {
    case OFBlockEnum.Start:
      ;(data.input?.variables || []).forEach((item: any, index: number) => {
        if (Array.isArray(item.value_selector) && item.value_selector.length > 0) {
          assertStringArray(item.value_selector, `${path}.input.variables[${index}].value_selector`)
        }
      })
      return
    case OFBlockEnum.IfElse:
      ;(data.cases || []).forEach((item: OFIfElseCase, index: number) => {
        ;(item.conditions || []).forEach((condition: any, conditionIndex: number) => {
          assertStringArray(
            condition.variable_selector,
            `${path}.cases[${index}].conditions[${conditionIndex}].variable_selector`
          )
          if (condition.compare_source_mode === 'variable') {
            assertStringArray(
              condition.compare_selector,
              `${path}.cases[${index}].conditions[${conditionIndex}].compare_selector`
            )
          }
        })
      })
      return
    case OFBlockEnum.Iteration:
      assertStringArray(data.iterator_selector, `${path}.iterator_selector`)
      if (Array.isArray(data.output_selector) && data.output_selector.length > 0) {
        assertStringArray(data.output_selector, `${path}.output_selector`)
      }
      ;(data.branch_output_selectors || []).forEach((item: any, index: number) => {
        assertNonEmptyString(
          item.source_handle_id,
          `${path}.branch_output_selectors[${index}].source_handle_id`
        )
        assertStringArray(
          item.output_selector,
          `${path}.branch_output_selectors[${index}].output_selector`
        )
      })
      return
    case OFBlockEnum.Loop:
      ;(data.loop_variables || []).forEach((item: any, index: number) => {
        if (item.value_type === 'variable') {
          assertStringArray(item.value_selector, `${path}.loop_variables[${index}].value_selector`)
        }
      })
      ;(data.break_conditions || []).forEach((condition: any, index: number) => {
        assertStringArray(
          condition.variable_selector,
          `${path}.break_conditions[${index}].variable_selector`
        )
      })
      return
    case OFBlockEnum.VariableAssign:
      ;(data.rules || []).forEach((rule: any, index: number) => {
        if (rule.source_mode === 'variable') {
          assertStringArray(rule.source_selector, `${path}.rules[${index}].source_selector`)
        }
      })
      return
    case OFBlockEnum.End:
      ;(data.output?.variables || []).forEach((item: any, index: number) => {
        if (item.value_selector !== undefined) {
          assertStringArray(
            item.value_selector,
            `${path}.output.variables[${index}].value_selector`
          )
        }
      })
      return
    default:
      return
  }
}

function validateEdgeHandles(
  edge: Record<string, any>,
  edgePath: string,
  nodeMap: Map<string, Record<string, any>>
): OFRunnableEdge {
  const source = assertNonEmptyString(edge.source, `${edgePath}.source`)
  assertNonEmptyString(edge.target, `${edgePath}.target`)
  const sourceHandle = assertNonEmptyString(edge.sourceHandle, `${edgePath}.sourceHandle`)
  const targetHandle = assertNonEmptyString(edge.targetHandle, `${edgePath}.targetHandle`)

  const sourceNode = nodeMap.get(source)
  const sourceType = sourceNode
    ? getNodeDisplayType(sourceNode, `${edgePath}.sourceNode`)
    : undefined
  if (targetHandle !== 'target') {
    throw new Error(`${edgePath}.targetHandle 必须等于 target`)
  }
  if (sourceType === OFBlockEnum.IfElse) {
    const cases = (sourceNode?.data?.cases || []) as OFIfElseCase[]
    const elseHandle = sourceNode?.data?.elseCase?.handleId
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
  graph: Record<string, any>,
  path: string
): void {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph.edges) ? graph.edges : []
  const viewport = assertRecord(graph.viewport, `${path}.viewport`)
  assertNumber(viewport.x, `${path}.viewport.x`)
  assertNumber(viewport.y, `${path}.viewport.y`)
  assertNumber(viewport.zoom, `${path}.viewport.zoom`)

  const nodeMap = new Map<string, Record<string, any>>()
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

export function assertRunnableWorkflow(value: unknown): OFRunnableWorkflow {
  const workflow = assertRecord(value, 'workflow')
  assertNonEmptyString(workflow.id, 'workflow.id')
  assertNonEmptyString(workflow.name, 'workflow.name')
  assertNonEmptyString(workflow.author, 'workflow.author')
  assertNumber(workflow.createdAt, 'workflow.createdAt')
  assertNumber(workflow.updatedAt, 'workflow.updatedAt')
  if (!['draft', 'published', 'archived'].includes(workflow.status)) {
    throw new Error('workflow.status 必须是 draft | published | archived')
  }

  const graph = assertRecord(workflow.graph, 'workflow.graph')
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph.edges) ? graph.edges : []
  if (nodes.length === 0) {
    throw new Error('workflow.graph.nodes 不能为空')
  }

  const nodeMap = new Map<string, Record<string, any>>()
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
    validateSelectorFields(nodeType, assertRecord(record.data, `${path}.data`), `${path}.data`)

    if (nodeType === OFBlockEnum.Iteration || nodeType === OFBlockEnum.Loop) {
      const data = assertRecord(record.data, `${path}.data`)
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
