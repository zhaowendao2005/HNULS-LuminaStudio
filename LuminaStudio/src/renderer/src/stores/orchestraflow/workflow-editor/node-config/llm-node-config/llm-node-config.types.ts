import type { OFLLMNodeConfig } from '@shared/Orchestraflow-types'

export interface OFLLMModelParamsPanelState {
  visible: boolean
  anchorRect: DOMRect | null
  activeNodeId: string | null
}

export type { OFLLMNodeConfig }
