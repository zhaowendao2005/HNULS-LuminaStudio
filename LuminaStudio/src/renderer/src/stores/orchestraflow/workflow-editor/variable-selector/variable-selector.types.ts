/**
 * OrchestraFlow 变量选择器类型定义
 */

import type { OFBlockEnum } from '@shared/Orchestraflow-types'

/**
 * 可引用的变量项
 */
export interface OFAvailableVariable {
  /** 变量唯一标识 */
  id: string
  /** 变量名（用于插值） */
  variable: string
  /** 显示标签 */
  label: string
  /** 来源节点 ID */
  nodeId: string
  /** 来源节点类型 */
  nodeType: OFBlockEnum
  /** 来源节点名称 */
  nodeTitle: string
  /** 变量值选择器 */
  valueSelector: string[]
}

/**
 * 变量选择器状态
 */
export interface VariableSelectorState {
  /** 是否显示选择器 */
  visible: boolean
  /** 当前激活的目标节点 ID */
  targetNodeId: string | null
  /** 目标类型：'prompt' 提示词输入 | 'output' 输出变量 */
  targetType: 'prompt' | 'output'
  /** 可用的变量列表 */
  availableVariables: OFAvailableVariable[]
  /** 搜索关键词 */
  searchKeyword: string
  /** 光标位置（用于 prompt 插入） */
  cursorPosition: number
  /** 触发器锚点（用于弹层定位） */
  anchorRect?: DOMRect | null
}
