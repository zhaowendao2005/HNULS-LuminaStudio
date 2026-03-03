/**
 * OrchestraFlow 工作流编辑器类型定义
 */
import type {
  OFBlockEnum,
  OFControlMode,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData,
  OFCommonEdgeType,
  OFNode,
  OFEdge
} from '@Public/ShareTypes/Orchestraflow-types'

export type { OFNode, OFEdge }
export type {
  OFBlockEnum,
  OFControlMode,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData,
  OFCommonEdgeType
}

export interface WorkflowEditorState {
  nodes: OFNode[]
  edges: OFEdge[]
  selectedNodeId: string | null
  panelWidth: number
  controlMode: OFControlMode
  viewport: { x: number; y: number; zoom: number }
}
