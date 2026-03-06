/**
 * BaseNode - 基础节点抽象类
 *
 * 所有节点类型都应继承此类
 */
import type {
  OFBlockEnum,
  OFNode,
  OFStartNodeData,
  OFLLMNodeData,
  OFIterationNodeData,
  OFIfElseNodeData,
  OFEndNodeData
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

export abstract class BaseNode {
  abstract readonly nodeType: OFBlockEnum
  protected context: ExecutionContext
  protected variableStore: VariableStore

  constructor(node: OFNode, variableStore: VariableStore) {
    this.context = {
      runId: '',
      node,
      inputs: {},
      variables: {},
      providerConfigs: {}
    }
    this.variableStore = variableStore
  }

  setContext(context: ExecutionContext): void {
    this.context = context
  }

  /**
   * 获取输入值
   */
  protected getInput(key: string): any {
    return this.context.inputs[key]
  }

  /**
   * 获取变量（通过 selector）
   */
  protected getVariable(selector: string[]): any {
    return this.variableStore.getBySelector(selector)
  }

  /**
   * 设置输出到变量存储
   */
  protected setOutput(key: string, value: any): void {
    this.variableStore.set(key, value)
  }

  /**
   * 执行节点
   */
  abstract execute(context: ExecutionContext): Promise<NodeResult>

  /**
   * 获取节点配置数据
   */
  protected getNodeData():
    | OFStartNodeData
    | OFLLMNodeData
    | OFIterationNodeData
    | OFIfElseNodeData
    | OFEndNodeData {
    return this.context.node.data as any
  }

  /**
   * 获取 provider 配置
   */
  protected getProviderConfig(providerId: string) {
    return this.context.providerConfigs?.[providerId]
  }
}
