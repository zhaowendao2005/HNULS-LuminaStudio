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
  OFIterationNodeData,
  OFLoopVariableData,
  OFNode,
  OFWorkflow
} from '@shared/Orchestraflow-types'
import {
  normalizeOFVariableNamespace,
  OFBlockEnum
} from '@shared/Orchestraflow-types'
import {
  getOFDefaultNodeTitle
} from '@shared/Orchestraflow-types/node-definition'
import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types/node-definition-registry'

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
): { nodes: OFNode[]; edges: OFEdge[] } {
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
  const title = String(node.title || definition.meta.title || getOFDefaultNodeTitle(node.type)).trim()
  const desc = String(node.description || '').trim()
  const shell = createNodeShell(compiledId, definition.meta.vueFlowType, index, context.parentNodeId)
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

function createNodeShell(id: string, type: OFBlockEnum, index: number, parentNodeId?: string): OFNode {
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
    return {
      ...variable,
      value_selector: compileSelectorField(variable.value_selector, idMap)
    }
  })
}

function compileLoopVariables(source: unknown[], idMap: Map<string, string>): OFLoopVariableData[] {
  return source.map((item) => {
    const variable = item as OFLoopVariableData
    return {
      ...variable,
      value_selector: compileSelectorField(variable.value_selector, idMap)
    }
  })
}

function compileConditions(source: unknown[], idMap: Map<string, string>): OFIfElseCondition[] {
  return source.map((item) => {
    const condition = item as OFIfElseCondition
    return {
      ...condition,
      variable_selector: compileSelectorField(condition.variable_selector, idMap),
      compare_selector: compileSelectorField(condition.compare_selector, idMap)
    }
  })
}

function compileVariableAssignRules(
  source: unknown[],
  idMap: Map<string, string>
): OFVariableAssignRule[] {
  return source.map((item) => {
    const rule = item as OFVariableAssignRule
    return {
      ...rule,
      source_selector: compileSelectorField(rule.source_selector, idMap)
    }
  })
}

function compileIterationBranchOutputSelectors(
  source: unknown[],
  idMap: Map<string, string>
): OFIterationBranchOutputSelector[] {
  return source.map((item) => {
    const selector = item as OFIterationBranchOutputSelector
    return {
      source_node_id: rewriteSelectorRoot(selector.source_node_id, idMap),
      source_handle_id: selector.source_handle_id,
      output_selector: compileSelectorField(selector.output_selector, idMap)
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
    return value.length ? [rewriteSelectorRoot(String(value[0]), idMap), ...value.slice(1).map(String)] : []
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
