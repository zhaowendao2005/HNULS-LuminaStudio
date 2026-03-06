/**
 * OrchestraFlow 工作流编辑器类型定义
 */
import type {
  OFBlockEnum,
  OFControlMode,
  OFStartNodeData,
  OFIterationStartNodeData,
  OFLLMNodeData,
  OFIterationNodeData,
  OFEndNodeData,
  OFCommonEdgeType,
  OFNode,
  OFEdge
} from '@shared/Orchestraflow-types'

export type { OFNode, OFEdge }
export type {
  OFBlockEnum,
  OFControlMode,
  OFStartNodeData,
  OFIterationStartNodeData,
  OFLLMNodeData,
  OFIterationNodeData,
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
