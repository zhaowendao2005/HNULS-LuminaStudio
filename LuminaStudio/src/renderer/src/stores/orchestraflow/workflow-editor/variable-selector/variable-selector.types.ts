/**
 * OrchestraFlow 变量选择器类型定义
 */

import type { OFBlockEnum, OFJsonSchemaProperty, OFVarType } from '@shared/Orchestraflow-types'
import type { OFMechanismUiHint } from '../workflow-editor.types'

export type VariableSelectorTargetType =
  | 'prompt'
  | 'output'
  | 'condition'
  | 'iteration-input'
  | 'iteration-output'
  | 'variable-assign-source'
  | 'variable-assign-target'
  | 'loop-variable-init'
  | 'loop-condition-left'
  | 'loop-condition-right'

export interface OFAvailableVariable {
  id: string
  variable: string
  path: string
  label: string
  nodeId: string
  nodeType?: OFBlockEnum
  nodeTitle: string
  valueSelector: string[]
  type?: OFVarType | string
  schema?: OFJsonSchemaProperty | null
  selectable: boolean
  expandable: boolean
  children?: OFAvailableVariable[]
  isSystem?: boolean
}

export interface OFAvailableVariableGroup {
  id: string
  title: string
  nodeId: string
  nodeType?: OFBlockEnum
  isSystem?: boolean
  items: OFAvailableVariable[]
}

export interface OFVariableSelectorMechanismGuidance extends OFMechanismUiHint {
  targetType: VariableSelectorTargetType
}

export interface VariableSelectorState {
  visible: boolean
  targetNodeId: string | null
  targetType: VariableSelectorTargetType
  targetBranchSourceNodeId?: string | null
  targetBranchSourceHandleId?: string | null
  availableGroups: OFAvailableVariableGroup[]
  searchKeyword: string
  cursorPosition: number
  anchorRect?: DOMRect | null
  anchorPoint?: {
    x: number
    y: number
  } | null
}
