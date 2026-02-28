/**
 * OrchestraFlow 工作流编辑器类型定义
 */
import type { Node, Edge } from '@vue-flow/core'
import type {
  OFBlockEnum,
  OFControlMode,
  OFCommonNodeType,
  OFCommonEdgeType,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData
} from '@preload/types'

export type OFNode = Node<OFCommonNodeType<OFStartNodeData | OFLLMNodeData | OFEndNodeData>>
export type OFEdge = Edge<OFCommonEdgeType>

export interface WorkflowEditorState {
  nodes: OFNode[]
  edges: OFEdge[]
  selectedNodeId: string | null
  panelWidth: number
  controlMode: OFControlMode
  viewport: {
    x: number
    y: number
    zoom: number
  }
}
