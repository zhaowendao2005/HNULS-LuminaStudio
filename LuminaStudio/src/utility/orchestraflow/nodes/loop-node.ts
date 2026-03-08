import { randomUUID } from 'crypto'
import { BaseNode } from './base-node'
import {
  OF_LOOP_COUNT_VARIABLE_NAME,
  OF_LOOP_RESULT_VARIABLE_NAME,
  OF_LOOP_INDEX_VARIABLE_NAME,
  normalizeOFVariableNamespace,
  OFBlockEnum,
  type OFIfElseCondition,
  type OFLoopNodeData,
  type OFLoopVariableData
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { evaluateConditions } from './condition-evaluator'

export class LoopNode extends BaseNode {
  readonly nodeType: OFBlockEnum.Loop

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.Loop
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)
    const nodeData = this.getNodeData() as OFLoopNodeData
    this.validateConfig(nodeData)

    const normalizedTitle = normalizeOFVariableNamespace(nodeData.title, context.node.id)
    const inLoopId = `${context.runId}:${context.node.id}:${randomUUID()}`
    const scopePath = [...context.scopePath, context.node.id]
    const workingStore = this.variableStore.fork()

    this.initializeLoopVariables(nodeData.loop_variables, workingStore)

    for (let index = 0; index < nodeData.loop_count; index += 1) {
      if (context.isStopped()) {
        return this.buildStoppedResult(nodeData, workingStore)
      }

      this.setLoopRuntimeMetadata(workingStore, normalizedTitle, context.node.id, index, nodeData.loop_count)
      if (this.shouldBreak(nodeData.break_conditions, nodeData.logical_operator, workingStore)) {
        break
      }

      const childStore = this.createChildStore(
        workingStore,
        normalizedTitle,
        context.node.id,
        index,
        nodeData.loop_count
      )

      const childResult = await context.executeGraph({
        graph: nodeData.subgraph,
        variableStore: childStore,
        initialInputs: context.inputs,
        startNodeId: nodeData.start_node_id,
        scopePath,
        loopContext: {
          loopNodeId: context.node.id,
          loopTitle: normalizedTitle,
          loopCount: nodeData.loop_count,
          index,
          inLoopId,
          scopePath
        }
      })

      if (childResult.status !== 'succeeded') {
        return {
          outputs: this.buildFinalOutputs(nodeData, workingStore),
          error: childResult.error || 'Loop 子图执行失败'
        }
      }

      this.mergeLoopOutputs(nodeData.loop_variables, childResult.outputs || {}, workingStore)
    }

    const outputs = this.buildFinalOutputs(nodeData, workingStore)
    this.writeFinalOutputs(outputs, normalizedTitle, context.node.id)

    return { outputs }
  }

  private initializeLoopVariables(loopVariables: OFLoopVariableData[], workingStore: VariableStore): void {
    for (const loopVariable of loopVariables) {
      const value = this.resolveLoopVariableValue(loopVariable, workingStore)
      workingStore.set(loopVariable.variable, value)
    }
  }

  private resolveLoopVariableValue(
    loopVariable: OFLoopVariableData,
    workingStore: VariableStore
  ): unknown {
    if (loopVariable.value_type === 'constant') {
      return loopVariable.value ?? null
    }

    if (!loopVariable.value_selector?.length) {
      throw new Error(`循环变量 ${loopVariable.variable} 缺少 value_selector`)
    }

    return workingStore.getBySelector(loopVariable.value_selector)
  }

  private createChildStore(
    workingStore: VariableStore,
    normalizedTitle: string,
    loopNodeId: string,
    index: number,
    loopCount: number
  ): VariableStore {
    const childStore = workingStore.fork()
    this.setLoopRuntimeMetadata(childStore, normalizedTitle, loopNodeId, index, loopCount)
    return childStore
  }

  private setLoopRuntimeMetadata(
    store: VariableStore,
    normalizedTitle: string,
    loopNodeId: string,
    index: number,
    loopCount: number
  ): void {
    store.set(`${normalizedTitle}.${OF_LOOP_INDEX_VARIABLE_NAME}`, index)
    store.set(`${normalizedTitle}.${OF_LOOP_COUNT_VARIABLE_NAME}`, loopCount)
    store.set(`${loopNodeId}.${OF_LOOP_INDEX_VARIABLE_NAME}`, index)
    store.set(`${loopNodeId}.${OF_LOOP_COUNT_VARIABLE_NAME}`, loopCount)
  }

  private shouldBreak(
    breakConditions: OFIfElseCondition[] | undefined,
    logicalOperator: 'and' | 'or' | undefined,
    workingStore: VariableStore
  ): boolean {
    if (!breakConditions?.length) {
      return false
    }

    const normalizedConditions = breakConditions.map((item, index) =>
      index === 0 || item.logical_operator
        ? item
        : {
            ...item,
            logical_operator: logicalOperator || 'and'
          }
    )

    return evaluateConditions(workingStore, normalizedConditions)
  }

  private mergeLoopOutputs(
    loopVariables: OFLoopVariableData[],
    outputs: Record<string, any>,
    workingStore: VariableStore
  ): void {
    for (const loopVariable of loopVariables) {
      if (Object.prototype.hasOwnProperty.call(outputs, loopVariable.variable)) {
        workingStore.set(loopVariable.variable, outputs[loopVariable.variable])
      }
    }
  }

  private buildStoppedResult(
    nodeData: OFLoopNodeData,
    workingStore: VariableStore
  ): NodeResult {
    return {
      outputs: this.buildFinalOutputs(nodeData, workingStore),
      error: 'Workflow stopped'
    }
  }

  private buildFinalOutputs(
    nodeData: OFLoopNodeData,
    workingStore: VariableStore
  ): Record<string, any> {
    const result: Record<string, any> = {}
    for (const loopVariable of nodeData.loop_variables) {
      result[loopVariable.variable] = workingStore.get(loopVariable.variable)
    }

    return {
      [OF_LOOP_RESULT_VARIABLE_NAME]: result,
      ...result
    }
  }

  private writeFinalOutputs(
    outputs: Record<string, any>,
    normalizedTitle: string,
    loopNodeId: string
  ): void {
    const result = outputs[OF_LOOP_RESULT_VARIABLE_NAME] || {}
    this.setOutput(`${normalizedTitle}.${OF_LOOP_RESULT_VARIABLE_NAME}`, result)
    this.setOutput(`${loopNodeId}.${OF_LOOP_RESULT_VARIABLE_NAME}`, result)

    Object.entries(result).forEach(([key, value]) => {
      this.setOutput(`${normalizedTitle}.${key}`, value)
      this.setOutput(`${loopNodeId}.${key}`, value)
    })
  }

  private validateConfig(nodeData: OFLoopNodeData): void {
    if (!Number.isInteger(nodeData.loop_count) || nodeData.loop_count < 1) {
      throw new Error('loop_count 必须是大于等于 1 的整数')
    }
    if (!nodeData.subgraph?.nodes?.length) {
      throw new Error('subgraph 不能为空')
    }

    const startNodes = nodeData.subgraph.nodes.filter(
      (node) => node.data.type === OFBlockEnum.LoopStart
    )
    if (startNodes.length !== 1) {
      throw new Error('subgraph 必须且只能包含一个 LoopStart 节点')
    }
    if (!nodeData.start_node_id || startNodes[0].id !== nodeData.start_node_id) {
      throw new Error('start_node_id 必须指向唯一的 LoopStart 节点')
    }

    const invalidContainerNode = nodeData.subgraph.nodes.find((node) =>
      [OFBlockEnum.Iteration, OFBlockEnum.Loop].includes(node.data.type)
    )
    if (invalidContainerNode) {
      throw new Error(`子图内暂不支持容器节点: ${invalidContainerNode.data.type}`)
    }
  }
}
