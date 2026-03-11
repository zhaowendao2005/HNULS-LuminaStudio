import type { OFBlueprintEdge, OFBlueprintNode, OFBlueprintWorkflow } from './types'
import type {
  OFEdge,
  OFIfElseCondition,
  OFIterationBranchOutputSelector,
  OFIterationBranchOutputRef,
  OFIterationNodeData,
  OFLLMNodeData,
  OFLoopVariableData,
  OFNode,
  OFVariable,
  OFWorkflow
} from '../core-types'
import type { OFRunnableWorkflow } from '../contract'
import { OFBlockEnum, normalizeOFVariableNamespace } from '../core-types'
import { resolveOFNodeDefinition } from '../node-definition-registry'
import { getOFDefaultNodeTitle } from '../node-definition'

type CompileGraphContext = {
  parentNodeId?: string
  prefix?: string
  allowContainers: boolean
}

export function compileOFBlueprintToRunnable(blueprint: OFBlueprintWorkflow): OFRunnableWorkflow {
  if (blueprint.version !== '2.0') {
    throw new Error(`Unsupported Blueprint version: ${blueprint.version}`)
  }

  const graph = compileBlueprintGraph(
    {
      nodes: blueprint.nodes,
      edges: blueprint.edges
    },
    { allowContainers: true }
  )

  const now = Math.floor(Date.now() / 1000)
  const workflowId = normalizeOFVariableNamespace(blueprint.workflow.name || 'workflow', 'workflow')

  return {
    id: workflowId,
    name: blueprint.workflow.name,
    description: blueprint.workflow.description,
    author: blueprint.workflow.author || 'Blueprint Compiler',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    graph
  } as OFRunnableWorkflow
}

function compileBlueprintGraph(
  graph: Pick<OFBlueprintWorkflow, 'nodes' | 'edges'>,
  context: CompileGraphContext
): OFWorkflow['graph'] {
  const idMap = new Map<string, string>()
  graph.nodes.forEach((node) => {
    idMap.set(node.id, buildCompiledNodeId(node.id, context.prefix))
  })

  return {
    nodes: graph.nodes.map((node, index) => compileBlueprintNode(node, index, idMap, context)),
    edges: graph.edges.map((edge, index) => compileBlueprintEdge(edge, index, idMap))
  }
}

function compileBlueprintNode(
  node: OFBlueprintNode,
  index: number,
  idMap: Map<string, string>,
  context: CompileGraphContext
): OFNode {
  if (!context.allowContainers && [OFBlockEnum.Iteration, OFBlockEnum.Loop].includes(node.type)) {
    throw new Error(`Container node is not allowed inside subgraph: ${node.type}`)
  }

  const compiledId = expectCompiledId(node.id, idMap)
  const definition = resolveOFNodeDefinition(node.type)
  if (!('compiler' in definition)) {
    throw new Error(`Node type does not support Blueprint compilation: ${node.type}`)
  }
  const title = String(
    node.title || definition.meta.title || getOFDefaultNodeTitle(node.type)
  ).trim()
  const desc = String(node.description || '').trim()
  const shell = createNodeShell(
    compiledId,
    definition.meta.vueFlowType,
    index,
    context.parentNodeId
  )
  const helpers = {
    compileVariables(source: unknown[]) {
      return compileVariables(source, idMap)
    },
    compileLoopVariables(source: unknown[]) {
      return compileLoopVariables(source, idMap)
    },
    compileConditions(source: unknown[]) {
      return compileConditions(source, idMap)
    },
    compileIterationBranchOutputSelectors(source: unknown[]) {
      return compileIterationBranchOutputSelectors(source, idMap)
    },
    compileNodeContext(value: OFLLMNodeData['context']) {
      return compileNodeContext(value, idMap)
    },
    compileSelectorField(value: unknown) {
      return compileSelectorField(value, idMap)
    },
    compileContainerSubgraph(
      containerNode: OFBlueprintNode,
      containerCompiledId: string,
      containerTitle: string,
      type: OFBlockEnum.Iteration | OFBlockEnum.Loop,
      loopVariables?: OFLoopVariableData[]
    ) {
      return compileContainerSubgraph(
        containerNode,
        containerCompiledId,
        containerTitle,
        type,
        loopVariables
      )
    }
  }

  return {
    ...shell,
    data: definition.compiler.compileData({
      node,
      compiledId,
      title,
      desc,
      helpers
    })
  }
}

function compileContainerSubgraph(
  node: OFBlueprintNode,
  compiledId: string,
  title: string,
  type: OFBlockEnum.Iteration | OFBlockEnum.Loop,
  loopVariables: OFLoopVariableData[] = []
): {
  graph: OFIterationNodeData['subgraph']
  idMap: Map<string, string>
} {
  const compiled = compileBlueprintGraph(
    {
      nodes: node.subgraph?.nodes || [],
      edges: node.subgraph?.edges || []
    },
    {
      parentNodeId: compiledId,
      prefix: compiledId,
      allowContainers: false
    }
  )
  const internalStartType =
    type === OFBlockEnum.Iteration ? OFBlockEnum.IterationStart : OFBlockEnum.LoopStart
  const internalDefinition = resolveOFNodeDefinition(internalStartType)
  const inputVariables =
    internalStartType === OFBlockEnum.IterationStart
      ? internalDefinition.variables.buildRuntimeInputVariables?.({
          title,
          nodeId: compiledId
        }) || []
      : internalDefinition.variables.buildRuntimeInputVariables?.({
          title,
          nodeId: compiledId,
          loopVariables
        }) || []

  const internalStartNodeId = `${compiledId}-${internalDefinition.meta.vueFlowType}`
  const internalStartNode: OFNode = {
    id: internalStartNodeId,
    type: internalDefinition.meta.vueFlowType,
    position: { x: 30, y: 40 },
    parentNode: compiledId,
    extent: 'parent',
    data: internalDefinition.editor.normalizeData({
      node: {
        id: internalStartNodeId,
        type: internalDefinition.meta.vueFlowType,
        position: { x: 30, y: 40 },
        parentNode: compiledId,
        extent: 'parent',
        data: {
          title: internalDefinition.meta.title,
          desc: internalDefinition.meta.title,
          type: internalStartType,
          input: {
            variables: inputVariables
          }
        } as OFNode['data']
      },
      helpers: {
        normalizeNode(nodeValue) {
          const nodeDefinition = resolveOFNodeDefinition(nodeValue.data.type)
          return {
            ...nodeValue,
            type: nodeDefinition.meta.vueFlowType,
            data: nodeDefinition.editor.normalizeData({
              node: nodeValue,
              helpers: this
            })
          }
        }
      }
    })
  }

  const idMap = new Map<string, string>()
  node.subgraph?.nodes.forEach((child) => {
    idMap.set(child.id, `${compiledId}__${child.id}`)
  })

  return {
    graph: {
      nodes: [internalStartNode, ...compiled.nodes],
      edges: compiled.edges,
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    idMap
  }
}

function compileBlueprintEdge(
  edge: OFBlueprintEdge,
  index: number,
  idMap: Map<string, string>
): OFEdge {
  const source = expectCompiledId(edge.from.node, idMap)
  const target = expectCompiledId(edge.to.node, idMap)
  return {
    id: edge.id || `edge_${source}_${target}_${index}`,
    source,
    target,
    source_port_id: edge.from.handle || null,
    target_port_id: edge.to.handle || null,
    sourceHandle: edge.from.handle || null,
    targetHandle: edge.to.handle || null
  }
}

function createNodeShell(id: string, type: string, index: number, parentNodeId?: string): OFNode {
  const position = parentNodeId
    ? { x: 40 + index * 260, y: 60 + (index % 2) * 140 }
    : { x: 80 + index * 300, y: 180 + (index % 3) * 120 }

  return {
    id,
    type,
    position,
    parentNode: parentNodeId,
    extent: parentNodeId ? 'parent' : undefined,
    data: {} as OFNode['data']
  }
}

function buildCompiledNodeId(rawId: string, prefix?: string): string {
  const base = String(rawId || '').trim()
  if (!base) throw new Error('Blueprint node id cannot be empty')
  return prefix ? `${prefix}__${base}` : base
}

function expectCompiledId(nodeId: string, idMap: Map<string, string>): string {
  const resolved = idMap.get(nodeId)
  if (!resolved) throw new Error(`Unknown Blueprint node id: ${nodeId}`)
  return resolved
}

function compileVariables(source: unknown[], idMap: Map<string, string>): OFVariable[] {
  return source.map((item) => {
    const variable = item as OFVariable
    const selector = compileSelectorField(
      variable.value_ref?.selector ?? variable.value_selector,
      idMap
    )
    return {
      ...variable,
      value_ref: selector.length
        ? {
            ...(variable.value_ref || {}),
            selector,
            path: variable.value_ref?.path || selector.join('.'),
            label: variable.value_ref?.label || variable.label || variable.variable,
            type: variable.value_ref?.type || variable.type,
            schema: variable.value_ref?.schema ?? variable.schema ?? null,
            item_schema: variable.value_ref?.item_schema ?? variable.item_schema ?? null
          }
        : undefined
    }
  })
}

function compileLoopVariables(source: unknown[], idMap: Map<string, string>): OFLoopVariableData[] {
  return source.map((item) => {
    const variable = item as OFLoopVariableData
    const selector = compileSelectorField(
      variable.value_source?.mode === 'variable'
        ? variable.value_source.ref.selector
        : variable.value_selector,
      idMap
    )
    return {
      ...variable,
      value_source:
        variable.value_source?.mode === 'constant'
          ? variable.value_source
          : selector.length
            ? {
                mode: 'variable',
                ref: {
                  ...(variable.value_source?.mode === 'variable' ? variable.value_source.ref : {}),
                  selector,
                  path:
                    (variable.value_source?.mode === 'variable'
                      ? variable.value_source.ref.path
                      : undefined) || selector.join('.'),
                  label: variable.label || variable.variable,
                  type: variable.type,
                  schema: variable.schema ?? null,
                  item_schema: variable.item_schema ?? null
                }
              }
            : {
                mode: 'constant',
                constant_value: variable.value
              }
    }
  })
}

function compileConditions(source: unknown[], idMap: Map<string, string>): OFIfElseCondition[] {
  return source.map((item) => {
    const condition = item as OFIfElseCondition
    const variableSelector = compileSelectorField(
      condition.variable_ref?.selector ?? condition.variable_selector,
      idMap
    )
    const compareSelector = compileSelectorField(
      condition.compare_ref?.selector ?? condition.compare_selector,
      idMap
    )
    return {
      ...condition,
      variable_ref: {
        ...(condition.variable_ref || {}),
        selector: variableSelector,
        path: condition.variable_ref?.path || variableSelector.join('.'),
        label: condition.variable_ref?.label,
        type: condition.variable_ref?.type || condition.variable_type
      },
      compare_ref:
        condition.compare_source_mode === 'variable' && compareSelector.length
          ? {
              ...(condition.compare_ref || {}),
              selector: compareSelector,
              path: condition.compare_ref?.path || compareSelector.join('.'),
              label: condition.compare_ref?.label,
              type: condition.compare_ref?.type || condition.compare_type
            }
          : undefined
    }
  })
}

function compileIterationBranchOutputSelectors(
  source: unknown[],
  idMap: Map<string, string>
): OFIterationBranchOutputRef[] {
  return source.map((item) => {
    const selector = item as OFIterationBranchOutputSelector
    return {
      source_node_id: rewriteSelectorRoot(selector.source_node_id, idMap),
      source_handle_id: selector.source_handle_id,
      output_ref: {
        ...(selector.output_ref || {}),
        selector: compileSelectorField(
          selector.output_ref?.selector ?? selector.output_selector,
          idMap
        ),
        path:
          selector.output_ref?.path ||
          compileSelectorField(
            selector.output_ref?.selector ?? selector.output_selector,
            idMap
          ).join('.')
      }
    }
  })
}

function compileNodeContext(
  value: OFLLMNodeData['context'],
  idMap: Map<string, string>
): OFLLMNodeData['context'] {
  if (!value) return value
  const variableSelector = compileSelectorField(value.variable_selector, idMap)
  return {
    ...value,
    variable_selector: variableSelector.length ? variableSelector : undefined
  }
}

function compileSelectorField(value: unknown, idMap: Map<string, string>): string[] {
  if (Array.isArray(value)) {
    return value.length
      ? [rewriteSelectorRoot(String(value[0]), idMap), ...value.slice(1).map(String)]
      : []
  }

  if (typeof value === 'string') {
    const parts = value
      .split('.')
      .map((item) => item.trim())
      .filter(Boolean)
    if (!parts.length) return []
    return [rewriteSelectorRoot(parts[0], idMap), ...parts.slice(1)]
  }

  return []
}

function rewriteSelectorRoot(root: string, idMap: Map<string, string>): string {
  return idMap.get(root) || root
}
