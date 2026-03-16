import type {
  OFEdge,
  OFIfElseCase,
  OFIfElseCondition,
  OFIfElseElseCase,
  OFJsonSchemaProperty,
  OFLoopVariableData,
  OFNode,
  OFPromptItem,
  OFStructuredOutputConfig,
  OFValueSource,
  OFVariable,
  OFVariableAssignRule
} from '../core-types'
import { resolveOFAuthoringNodeDefinition } from '../node-definition-registry'
import type { OFRunnableWorkflow } from '../contract'
import type { OFAuthoringTomlDocument, OFAuthoringTomlEdgeRecord, OFAuthoringTomlNodeRecord } from './types'

type CompiledNodeContext = {
  parentNodeId?: string
  nodeIndex: number
}

function toSelector(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => String(item))
}

function toPromptItems(text: string): OFPromptItem[] {
  return [
    {
      id: `prompt_${Date.now()}`,
      role: 'user',
      text
    }
  ]
}

function parseStructSpec(spec: string | undefined): OFStructuredOutputConfig {
  if (!spec?.trim()) {
    return { enabled: false, schema: null }
  }

  const properties: Record<string, OFJsonSchemaProperty> = {}
  const required: string[] = []
  spec
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const [name, type] = item.split(':')
      if (!name || !type) {
        return
      }
      const normalizedType = ['string', 'number', 'boolean'].includes(type) ? type : 'string'
      properties[name] = { type: normalizedType as 'string' | 'number' | 'boolean' }
      required.push(name)
    })

  return {
    enabled: required.length > 0,
    schema:
      required.length > 0
        ? {
            type: 'object',
            properties,
            required,
            additionalProperties: false
          }
        : null
  }
}

function compileVariables(source: unknown): OFVariable[] {
  if (!Array.isArray(source)) {
    return []
  }

  return source.map((item) => {
    const record = item as Record<string, unknown>
    return {
      variable: String(record.variable || ''),
      label: record.label ? String(record.label) : undefined,
      description: record.description ? String(record.description) : undefined,
      required: record.required === true,
      schema: (record.schema || null) as OFJsonSchemaProperty | null,
      value_selector: toSelector(record.variable_selector),
      value_template: (record.value ?? null) as OFVariable['value_template']
    }
  })
}

function compileIfConditions(source: unknown): OFIfElseCondition[] {
  if (!Array.isArray(source)) {
    return []
  }
  return source.map((item, index) => {
    const record = item as Record<string, unknown>
    return {
      id: String(record.id || `condition_${index + 1}`),
      variable_selector: toSelector(record.variable_selector),
      operator: String(record.operator || 'is') as OFIfElseCondition['operator'],
      value: (record.value ?? null) as string | number | boolean | null,
      logical_operator: record.logical_operator
        ? (String(record.logical_operator) as OFIfElseCondition['logical_operator'])
        : undefined
    }
  })
}

function compileIfCases(source: unknown): OFIfElseCase[] {
  if (!Array.isArray(source)) {
    return []
  }
  return source.map((item, index) => {
    const record = item as Record<string, unknown>
    return {
      id: String(record.id || `case_${index + 1}`),
      kind: index === 0 ? 'if' : 'elif',
      label: String(record.label || `CASE_${index + 1}`),
      handleId: String(record.handleId || `case_${index + 1}`),
      conditions: compileIfConditions(record.conditions)
    }
  })
}

function compileLoopVariables(source: unknown): OFLoopVariableData[] {
  if (!Array.isArray(source)) {
    return []
  }
  return source.map((item) => {
    const record = item as Record<string, unknown>
    const selector = toSelector(record.value_selector)
    const valueSource: OFValueSource | undefined = selector.length
      ? {
          mode: 'variable',
          ref: {
            selector
          }
        }
      : record.value !== undefined
        ? {
            mode: 'constant',
            constant_value: record.value as OFValueSource extends { constant_value: infer T } ? T : never
          }
        : undefined

    return {
      variable: String(record.variable || ''),
      label: record.label ? String(record.label) : undefined,
      description: record.description ? String(record.description) : undefined,
      required: record.required === true,
      value_type: record.value_type ? String(record.value_type) as OFLoopVariableData['value_type'] : 'constant',
      value: (record.value ?? null) as OFLoopVariableData['value'],
      value_selector: selector,
      schema: (record.schema || null) as OFJsonSchemaProperty | null,
      value_source: valueSource
    }
  })
}

function compileAssignRules(source: unknown): OFVariableAssignRule[] {
  if (!Array.isArray(source)) {
    return []
  }
  return source.map((item, index) => {
    const record = item as Record<string, unknown>
    const sourceRecord = (record.source || {}) as Record<string, unknown>
    const refRecord = (sourceRecord.ref || {}) as Record<string, unknown>
    const selector = toSelector(refRecord.selector)
    const sourceMode = sourceRecord.mode === 'variable' ? 'variable' : 'constant'
    return {
      id: String(record.id || `rule_${index + 1}`),
      source_mode: sourceMode,
      source:
        sourceMode === 'variable'
          ? {
              mode: 'variable',
              ref: {
                selector
              }
            }
          : {
              mode: 'constant',
              constant_value: sourceRecord.value as OFValueSource extends { constant_value: infer T } ? T : never
            },
      target_variable: String(record.target_variable || ''),
      target_label: record.target_label ? String(record.target_label) : undefined,
      target_type: String(record.target_type || 'string') as OFVariableAssignRule['target_type'],
      description: record.description ? String(record.description) : undefined,
      schema: (record.schema || null) as OFJsonSchemaProperty | null
    }
  })
}

function compileEndOutputs(source: unknown): OFVariable[] {
  if (!Array.isArray(source)) {
    return []
  }
  return source.map((item) => {
    const record = item as Record<string, unknown>
    return {
      variable: String(record.variable || ''),
      value_selector: toSelector(record.variable_selector),
      description: record.description ? String(record.description) : undefined
    }
  })
}

function buildNodeBase(record: OFAuthoringTomlNodeRecord, context: CompiledNodeContext): OFNode {
  const runtimeType = resolveOFAuthoringNodeDefinition(record.type).runtime.type
  return {
    id: record.id,
    type: record.id,
    parentNode: context.parentNodeId,
    extent: context.parentNodeId ? 'parent' : undefined,
    position: {
      x: 80 + context.nodeIndex * 280,
      y: context.parentNodeId ? 80 : 120
    },
    data: {
      title: record.title,
      desc: record.description || '',
      type: runtimeType
    } as OFNode['data']
  }
}

function compileNodeRecord(record: OFAuthoringTomlNodeRecord, context: CompiledNodeContext): OFNode {
  const definition = resolveOFAuthoringNodeDefinition(record.type)
  const defaultData = definition.editor.createDefaultData({
    nodeId: record.id,
    title: record.title
  })

  let data = { ...defaultData, desc: record.description || '' } as Record<string, unknown>

  if (record.type === 'start') {
    data.input = { variables: compileVariables(record.inputs) }
  } else if (record.type === 'llm') {
    const model = String(record.model || 'openai/gpt-4.1-mini')
    const [provider, name] = model.includes('/') ? model.split('/', 2) : ['openai', model]
    data.model = { provider, name }
    data.prompt_template = toPromptItems(String(record.prompt || ''))
    data.structured_output = parseStructSpec(
      record.struct ? String(record.struct) : undefined
    ) as OFStructuredOutputConfig
  } else if (record.type === 'if') {
    data.cases = compileIfCases(record.cases)
    data.elseCase = {
      handleId: 'else',
      label: String(record.elseLabel || 'ELSE')
    } as OFIfElseElseCase
  } else if (record.type === 'iter') {
    const subgraph = compileTomlSubgraph(record.subgraph, record.id)
    data.iterator_selector = toSelector(record.iterator_selector)
    data.output_selector = toSelector(record.output_selector)
    data.branch_output_selectors = Array.isArray(record.branch_output_selectors)
      ? (record.branch_output_selectors as OFEdge['data'][])
      : []
    data.parallel_mode = record.parallel_mode ? String(record.parallel_mode) : 'sequential'
    data.parallel_nums = Number(record.parallel_nums || 1)
    data.error_handle_mode = record.error_handle_mode ? String(record.error_handle_mode) : 'terminated'
    data.flatten_output = record.flatten_output !== false
    data.subgraph = subgraph
  } else if (record.type === 'loop') {
    const subgraph = compileTomlSubgraph(record.subgraph, record.id)
    data.loop_count = Number(record.loop_count || 1)
    data.loop_count_selector = toSelector(record.loop_count_selector)
    data.loop_variables = compileLoopVariables(record.loop_variables)
    data.break_conditions = compileIfConditions(record.break_conditions)
    data.logical_operator = record.logical_operator ? String(record.logical_operator) : 'and'
    data.subgraph = subgraph
  } else if (record.type === 'set') {
    data.rules = compileAssignRules(record.rules)
  } else if (record.type === 'end') {
    data.output = { variables: compileEndOutputs(record.outputs) }
  }

  const draftNode = buildNodeBase(record, context)
  draftNode.data = data as unknown as OFNode['data']
  return {
    ...draftNode,
    data: definition.editor.normalizeData({
      node: draftNode,
      helpers: {
        normalizeNode(node) {
          return node
        }
      }
    }) as unknown as OFNode['data']
  }
}

function compileEdges(
  edges: OFAuthoringTomlEdgeRecord[],
  nodeMap: Map<string, OFNode>
): OFRunnableWorkflow['graph']['edges'] {
  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source)
    const targetNode = nodeMap.get(edge.target)
    return {
      id: `${edge.source}:${edge.sourceHandle || 'source'}->${edge.target}:${edge.targetHandle || 'target'}`,
      source: edge.source,
      target: edge.target,
      source_port_id: edge.sourceHandle || 'source',
      target_port_id: edge.targetHandle || 'target',
      sourceHandle: edge.sourceHandle || 'source',
      targetHandle: edge.targetHandle || 'target',
      data: sourceNode && targetNode
        ? {
            sourceType: sourceNode.data.type,
            targetType: targetNode.data.type
          }
        : undefined
    }
  })
}

function compileTomlSubgraph(
  rawSubgraph: unknown,
  parentNodeId: string
): OFRunnableWorkflow['graph'] {
  const record = (rawSubgraph || {}) as Record<string, unknown>
  const nodesSource = Array.isArray(record.nodes) ? record.nodes : []
  const edgesSource = Array.isArray(record.edges) ? record.edges : []

  const nodes = nodesSource.map((node, index) =>
    compileNodeRecord(node as OFAuthoringTomlNodeRecord, {
      parentNodeId,
      nodeIndex: index
    })
  )
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const edges = compileEdges(edgesSource as OFAuthoringTomlEdgeRecord[], nodeMap)

  return {
    nodes,
    edges
  } as unknown as OFRunnableWorkflow['graph']
}

export function compileOFAuthoringTomlDocumentToWorkflow(
  document: OFAuthoringTomlDocument
): OFRunnableWorkflow {
  const nodes = document.nodes.map((node, index) =>
    compileNodeRecord(node, {
      nodeIndex: index
    })
  )
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const edges = compileEdges(document.edges, nodeMap)

  return {
    id: '',
    name: document.workflow.name,
    description: document.workflow.description,
    author: 'GenerateView',
    createdAt: 0,
    updatedAt: 0,
    status: 'draft',
    graph: {
      nodes,
      edges
    }
  } as unknown as OFRunnableWorkflow
}
