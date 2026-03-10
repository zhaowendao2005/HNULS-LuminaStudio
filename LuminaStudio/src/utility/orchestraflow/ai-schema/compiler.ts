/**
 * DSL 编译器：把内部辅助 DSL 编译成当前持久化 OFWorkflow graph。
 * 由 compiler 负责内部开始节点注入和派生 output 生成，避免作者侧重复维护。
 *
 * 长期规则：
 * - 归一化和自动生成的运行时字段应收敛在这里，避免作者侧契约无限膨胀。
 */
import type {
  OFAIDslEdge,
  OFAIDslNode,
  OFAIDslWorkflow,
  OFEdge,
  OFIfElseCondition,
  OFIterationBranchOutputRef,
  OFIterationNodeData,
  OFLLMNodeData,
  OFLoopVariableData,
  OFNode,
  OFVariable,
  OFWorkflow
} from '@shared/Orchestraflow-types'
import {
  getOFDefaultNodeTitle,
  normalizeOFVariableNamespace,
  OFBlockEnum,
  resolveOFNodeDefinition
} from '@shared/Orchestraflow-types'

type CompileGraphContext = {
  parentNodeId?: string
  prefix?: string
  allowContainers: boolean
}

export function compileAIDslToWorkflow(dsl: OFAIDslWorkflow): OFWorkflow {
  if (dsl.version !== '1.0') {
    throw new Error(`Unsupported AI DSL version: ${dsl.version}`)
  }

  const graph = compileDslGraph(
    {
      nodes: dsl.nodes,
      edges: dsl.edges
    },
    { allowContainers: true }
  )

  const now = Math.floor(Date.now() / 1000)
  const workflowId = normalizeOFVariableNamespace(dsl.workflow.name || 'workflow', 'workflow')

  return {
    id: workflowId,
    name: dsl.workflow.name,
    description: dsl.workflow.description,
    author: dsl.workflow.author || 'AI DSL',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    graph
  }
}

function compileDslGraph(
  graph: Pick<OFAIDslWorkflow, 'nodes' | 'edges'>,
  context: CompileGraphContext
): OFWorkflow['graph'] {
  // 容器子图递归编译，并使用自己的 id 命名空间，避免父子图节点冲突。
  const idMap = new Map<string, string>()
  graph.nodes.forEach((node) => {
    idMap.set(node.id, buildCompiledNodeId(node.id, context.prefix))
  })

  return {
    nodes: graph.nodes.map((node, index) => compileDslNode(node, index, idMap, context)),
    edges: graph.edges.map((edge, index) => compileDslEdge(edge, index, idMap))
  }
}

function compileDslNode(
  node: OFAIDslNode,
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
    throw new Error(`Node type does not support AI DSL compilation: ${node.type}`)
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
    compileNodeContext(value: OFAIDslNode['config']['context']) {
      return compileNodeContext(value, idMap)
    },
    compileSelectorField(value: unknown) {
      return compileSelectorField(value, idMap)
    },
    compileContainerSubgraph(
      containerNode: OFAIDslNode,
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
  node: OFAIDslNode,
  compiledId: string,
  title: string,
  type: OFBlockEnum.Iteration | OFBlockEnum.Loop,
  loopVariables: OFLoopVariableData[] = []
): {
  graph: OFIterationNodeData['subgraph']
  idMap: Map<string, string>
} {
  const compiled = compileDslGraph(
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

  const internalStartNode: OFNode = {
    id: `${compiledId}-${internalDefinition.meta.vueFlowType}`,
    type: internalDefinition.meta.vueFlowType,
    position: { x: 30, y: 40 },
    parentNode: compiledId,
    extent: 'parent',
    data: internalDefinition.editor.normalizeData({
      node: {
        id: `${compiledId}-${internalDefinition.meta.vueFlowType}`,
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
        normalizeNode(node) {
          const definition = resolveOFNodeDefinition(node.data.type)
          return {
            ...node,
            type: definition.meta.vueFlowType,
            data: definition.editor.normalizeData({
              node,
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

function compileDslEdge(edge: OFAIDslEdge, index: number, idMap: Map<string, string>): OFEdge {
  const source = expectCompiledId(edge.from.node, idMap)
  const target = expectCompiledId(edge.to.node, idMap)
  return {
    id: `edge_${source}_${target}_${index}`,
    source,
    target,
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
  if (!base) throw new Error('AI DSL node id cannot be empty')
  return prefix ? `${prefix}__${base}` : base
}

function expectCompiledId(nodeId: string, idMap: Map<string, string>): string {
  const resolved = idMap.get(nodeId)
  if (!resolved) throw new Error(`Unknown node id: ${nodeId}`)
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
          selectorToPath(
            compileSelectorField(selector.output_ref?.selector ?? selector.output_selector, idMap)
          )
      }
    }
  })
}

function compileNodeContext(
  value: OFLLMNodeData['context'],
  idMap: Map<string, string>
): OFLLMNodeData['context'] {
  if (!value) return value
  return {
    ...value,
    variable_selector: compileSelectorField(value.variable_selector, idMap)
  }
}

function compileSelectorField(value: unknown, idMap: Map<string, string>): string[] {
  // 运行时 selector 的真实格式是路径数组；字符串形式只是一种作者输入便利。
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

function selectorToPath(selector: string[]): string {
  return selector.join('.')
}

function rewriteSelectorRoot(root: string, idMap: Map<string, string>): string {
  return idMap.get(root) || root
}
