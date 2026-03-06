import { randomUUID } from 'crypto'
import { BaseNode } from './base-node'
import {
  normalizeOFVariableNamespace,
  OFBlockEnum,
  type OFIterationNodeData
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

interface IterationItemResult {
  index: number
  value: unknown
  error?: string
}

export class IterationNode extends BaseNode {
  readonly nodeType: OFBlockEnum.Iteration

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.Iteration
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)
    const nodeData = this.getNodeData() as OFIterationNodeData
    this.validateConfig(nodeData)

    const items = this.variableStore.getBySelector(nodeData.iterator_selector)
    if (!Array.isArray(items)) {
      return {
        outputs: {},
        error: 'iterator_selector 必须解析为数组'
      }
    }

    const normalizedTitle = normalizeOFVariableNamespace(nodeData.title, context.node.id)
    const inIterationId = `${context.runId}:${context.node.id}:${randomUUID()}`
    const scopePath = [...context.scopePath, context.node.id]
    const results = this.createInitialResults(items.length)

    const runItem = async (
      item: unknown,
      index: number,
      parallelRunId?: string
    ): Promise<IterationItemResult> => {
      const childStore = this.createChildStore(
        normalizedTitle,
        context.node.id,
        item,
        index,
        items.length
      )
      const childResult = await context.executeGraph({
        graph: nodeData.subgraph,
        variableStore: childStore,
        initialInputs: context.inputs,
        startNodeId: nodeData.start_node_id,
        scopePath,
        iterationContext: {
          iterationNodeId: context.node.id,
          iterationTitle: normalizedTitle,
          iterationLength: items.length,
          item,
          index,
          inIterationId,
          parallelRunId,
          scopePath
        }
      })

      if (childResult.status !== 'succeeded') {
        return {
          index,
          value: null,
          error: childResult.error || 'Iteration 子图执行失败'
        }
      }

      const value = childStore.getBySelector(nodeData.output_selector)
      return {
        index,
        value: value === undefined ? null : value
      }
    }

    const parallelMode =
      nodeData.parallel_mode === 'parallel' || (nodeData.parallel_mode === undefined && nodeData.is_parallel)
    const errorMode = nodeData.error_handle_mode || 'terminated'

    let terminatedError: string | undefined
    if (parallelMode) {
      const concurrency = this.clampParallel(nodeData.parallel_nums)
      let cursor = 0
      let stopDispatch = false

      const worker = async (workerIndex: number) => {
        while (true) {
          if (stopDispatch || context.isStopped()) {
            return
          }

          const currentIndex = cursor
          cursor += 1
          if (currentIndex >= items.length) {
            return
          }

          const itemResult = await runItem(items[currentIndex], currentIndex, `worker-${workerIndex}`)
          results[currentIndex] = itemResult.value
          if (itemResult.error) {
            if (errorMode === 'terminated') {
              terminatedError = itemResult.error
              stopDispatch = true
            } else {
              results[currentIndex] = null
            }
          }
        }
      }

      await Promise.all(
        Array.from({ length: concurrency }, (_item, index) => worker(index))
      )
    } else {
      for (let index = 0; index < items.length; index += 1) {
        if (context.isStopped()) {
          terminatedError = 'Workflow stopped'
          break
        }

        const itemResult = await runItem(items[index], index)
        results[index] = itemResult.value
        if (itemResult.error) {
          if (errorMode === 'terminated') {
            terminatedError = itemResult.error
            break
          }
          results[index] = null
        }
      }
    }

    if (context.isStopped()) {
      return {
        outputs: { result: results },
        error: 'Workflow stopped'
      }
    }

    if (terminatedError) {
      return {
        outputs: { result: results },
        error: terminatedError
      }
    }

    const finalResult = this.finalizeResults(results, nodeData)
    this.setOutput(`${normalizedTitle}.result`, finalResult)
    this.setOutput(`${context.node.id}.result`, finalResult)

    return {
      outputs: {
        result: finalResult
      }
    }
  }

  private createChildStore(
    normalizedTitle: string,
    iterationNodeId: string,
    item: unknown,
    index: number,
    length: number
  ): VariableStore {
    const childStore = this.variableStore.fork()
    childStore.set(`${normalizedTitle}.item`, item)
    childStore.set(`${normalizedTitle}.index`, index)
    childStore.set(`${normalizedTitle}.length`, length)
    childStore.set(`${iterationNodeId}.item`, item)
    childStore.set(`${iterationNodeId}.index`, index)
    childStore.set(`${iterationNodeId}.length`, length)
    return childStore
  }

  private createInitialResults(length: number): unknown[] {
    return Array.from({ length }, () => null)
  }

  private finalizeResults(results: unknown[], nodeData: OFIterationNodeData): unknown[] {
    const filtered =
      nodeData.error_handle_mode === 'remove-abnormal-output'
        ? results.filter((item) => item !== null)
        : results

    if (!nodeData.flatten_output) {
      return filtered
    }

    const nonNullItems = filtered.filter((item) => item !== null)
    if (nonNullItems.length === 0) {
      return filtered
    }

    if (nonNullItems.every(Array.isArray)) {
      return nonNullItems.flat(1)
    }

    return filtered
  }

  private validateConfig(nodeData: OFIterationNodeData): void {
    if (!nodeData.iterator_selector?.length) {
      throw new Error('iterator_selector 不能为空')
    }
    if (!nodeData.output_selector?.length) {
      throw new Error('output_selector 不能为空')
    }
    if (!nodeData.subgraph?.nodes?.length) {
      throw new Error('subgraph 不能为空')
    }

    const startNodes = nodeData.subgraph.nodes.filter(
      (node) => node.data.type === OFBlockEnum.IterationStart
    )
    if (startNodes.length !== 1) {
      throw new Error('subgraph 必须且只能包含一个 IterationStart 节点')
    }
    if (!nodeData.start_node_id || startNodes[0].id !== nodeData.start_node_id) {
      throw new Error('start_node_id 必须指向唯一的 IterationStart 节点')
    }

    const invalidContainerNode = nodeData.subgraph.nodes.find((node) =>
      [OFBlockEnum.Iteration].includes(node.data.type)
    )
    if (invalidContainerNode) {
      throw new Error(`子图内暂不支持容器节点: ${invalidContainerNode.data.type}`)
    }
  }

  private clampParallel(value?: number): number {
    const normalized = Number.isFinite(value) ? Math.floor(value as number) : 1
    return Math.min(10, Math.max(1, normalized || 1))
  }
}
