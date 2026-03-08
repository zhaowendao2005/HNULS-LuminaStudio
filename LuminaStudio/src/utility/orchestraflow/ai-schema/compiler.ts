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
  OFIterationBranchOutputSelector,
  OFIterationNodeData,
  OFLLMNodeData,
  OFLoopVariableData,
  OFNode,
  OFNodeOutput,
  OFPromptItem,
  OFStructuredJsonSchema,
  OFVariable,
  OFVariableAssignRule,
  OFWorkflow
} from '@shared/Orchestraflow-types'
import {
  buildIterationInnerStartVariables,
  buildIterationOutputVariables,
  buildLLMOutputVariables,
  buildLoopInnerStartVariables,
  buildLoopOutputVariables,
  buildVariableAssignOutputVariables,
  normalizeOFVariableNamespace,
  OFBlockEnum
} from '@shared/Orchestraflow-types'
import { getOFRuntimeNodeDescriptor } from './registry'

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
  const title = String(node.title || getOFRuntimeNodeDescriptor(node.type).title).trim()
  const desc = String(node.description || '').trim()
  const shell = createNodeShell(compiledId, node.type, index, context.parentNodeId)

  switch (node.type) {
    case OFBlockEnum.Start:
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.Start,
          input: {
            variables: compileVariables(node.config.input?.variables || [], idMap)
          }
        }
      }
    case OFBlockEnum.LLM: {
      const structuredOutput = {
        enabled: Boolean(node.config.structured_output?.enabled),
        schema: (node.config.structured_output?.schema || null) as OFStructuredJsonSchema | null
      }
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.LLM,
          model: node.config.model || { provider: '', name: '' },
          prompt_template: (node.config.prompt_template || []) as OFPromptItem[],
          context: compileNodeContext(node.config.context, idMap),
          memory: node.config.memory,
          vision: node.config.vision,
          structured_output: structuredOutput,
          output: {
            variables: buildLLMOutputVariables(title, structuredOutput)
          }
        } as OFLLMNodeData
      }
    }
    case OFBlockEnum.IfElse:
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.IfElse,
          cases: (node.config.cases || []).map((item: any) => ({
            ...item,
            conditions: compileConditions(item.conditions || [], idMap)
          })),
          elseCase: node.config.elseCase || {
            handleId: 'else',
            label: 'ELSE'
          }
        }
      }
    case OFBlockEnum.Iteration: {
      if (!node.subgraph) throw new Error(`Iteration node "${node.id}" requires subgraph`)
      const compiledSubgraph = compileContainerSubgraph(node, compiledId, title, OFBlockEnum.Iteration)
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.Iteration,
          width: 650,
          height: 417,
          iterator_selector: compileSelectorField(node.config.iterator_selector, idMap),
          output_selector: compileSelectorField(node.config.output_selector, compiledSubgraph.idMap),
          branch_output_selectors: compileIterationBranchOutputSelectors(
            node.config.branch_output_selectors || [],
            compiledSubgraph.idMap
          ),
          start_node_id: `${compiledId}-iteration-start`,
          subgraph: compiledSubgraph.graph,
          parallel_mode: node.config.parallel_mode || 'sequential',
          parallel_nums: Number(node.config.parallel_nums || 1),
          error_handle_mode: node.config.error_handle_mode || 'terminated',
          flatten_output: node.config.flatten_output ?? true,
          output: {
            variables: buildIterationOutputVariables(title, compiledId)
          }
        } as OFIterationNodeData
      }
    }
    case OFBlockEnum.Loop: {
      if (!node.subgraph) throw new Error(`Loop node "${node.id}" requires subgraph`)
      const loopVariables = compileLoopVariables(node.config.loop_variables || [], idMap)
      const compiledSubgraph = compileContainerSubgraph(
        node,
        compiledId,
        title,
        OFBlockEnum.Loop,
        loopVariables
      )
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.Loop,
          width: 650,
          height: 417,
          loop_count: Number(node.config.loop_count || 1),
          loop_variables: loopVariables,
          break_conditions: compileConditions(node.config.break_conditions || [], idMap),
          logical_operator: node.config.logical_operator || 'and',
          start_node_id: `${compiledId}-loop-start`,
          subgraph: compiledSubgraph.graph,
          output: {
            variables: buildLoopOutputVariables(title, loopVariables, compiledId)
          }
        }
      }
    }
    case OFBlockEnum.VariableAssign: {
      const rules = compileVariableAssignRules(node.config.rules || [], idMap)
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.VariableAssign,
          rules,
          output: {
            variables: buildVariableAssignOutputVariables(title, rules, compiledId)
          }
        }
      }
    }
    case OFBlockEnum.End:
      return {
        ...shell,
        data: {
          title,
          desc,
          type: OFBlockEnum.End,
          output: {
            variables: compileVariables(node.config.output?.variables || [], idMap)
          } as OFNodeOutput
        }
      }
    default:
      throw new Error(`Unsupported AI DSL node type: ${node.type}`)
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
  // 内部开始节点属于运行时不变量，不是可选的作者便利字段。
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

  const internalStartNode: OFNode =
    type === OFBlockEnum.Iteration
      ? {
          id: `${compiledId}-iteration-start`,
          type: OFBlockEnum.IterationStart,
          position: { x: 30, y: 40 },
          parentNode: compiledId,
          extent: 'parent',
          data: {
            title: `${title}_start`,
            desc: '',
            type: OFBlockEnum.IterationStart,
            input: {
              variables: buildIterationInnerStartVariables(title, compiledId)
            }
          }
        }
      : {
          id: `${compiledId}-loop-start`,
          type: OFBlockEnum.LoopStart,
          position: { x: 30, y: 40 },
          parentNode: compiledId,
          extent: 'parent',
          data: {
            title: `${title}_start`,
            desc: '',
            type: OFBlockEnum.LoopStart,
            input: {
              variables: buildLoopInnerStartVariables(title, loopVariables, compiledId)
            }
          }
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
