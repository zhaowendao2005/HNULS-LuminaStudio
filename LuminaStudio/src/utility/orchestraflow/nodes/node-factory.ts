import type { OFNode } from '@shared/Orchestraflow-types'
import { VariableStore } from '../services/variable-store'
import { createRuntimeNodeFromDefinition } from '../ai-schema'

export class NodeFactory {
  static createNode(node: OFNode, variableStore: VariableStore) {
    // 运行时节点解析必须保持 definition registry 驱动，避免执行层和导出层脱节。
    return createRuntimeNodeFromDefinition(node, variableStore)
  }
}
