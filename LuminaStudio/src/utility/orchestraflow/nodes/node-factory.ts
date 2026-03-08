import type { OFNode } from '@shared/Orchestraflow-types'
import { VariableStore } from '../services/variable-store'
import { createRuntimeNodeByDescriptor } from '../ai-schema'

export class NodeFactory {
  static createNode(node: OFNode, variableStore: VariableStore) {
    // 运行时节点解析必须保持 registry 驱动，避免执行层和 schema 导出层逐渐脱节。
    return createRuntimeNodeByDescriptor(node, variableStore)
  }
}
