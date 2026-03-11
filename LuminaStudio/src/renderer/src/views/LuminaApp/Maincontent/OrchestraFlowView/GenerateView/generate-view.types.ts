import type { Component } from 'vue'

export type MenuValue = 'dashboard' | 'sessions' | 'analysis' | 'design' | 'verify' | 'settings'
export type StageKey = 'analysis' | 'design' | 'verify' | 'workflow'
export type CopilotMode = 'analysis' | 'design'
export type RightPanel = CopilotMode | null

export type DiffLine = {
  num: number | null
  type: 'context' | 'removed' | 'added'
  text: string
}

export type AnalysisMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  kind: 'text' | 'plan-card'
  content: string
  streaming?: boolean
}

export type CopilotMessage = {
  id: string
  role: 'user' | 'assistant' | 'function'
  content: string
}

export type SessionDocumentState = {
  title: string
  fileName: string
  summary: string
  content: string
  diffLines: DiffLine[]
  agentMessages: CopilotMessage[]
  appliedTweaks: string[]
  autoApproved: boolean
  pendingContent: string | null
}

export type SessionPlanState = SessionDocumentState & {
  steps: string[]
}

export type SessionDesignState = SessionDocumentState

export type SessionItem = {
  id: string
  title: string
  currentStage: StageKey
  time: string
  summary: string
  analysisTurnCount: number
  planGenerated: boolean
  messages: AnalysisMessage[]
  plan: SessionPlanState
  design: SessionDesignState
}

export type MenuItem = {
  value: MenuValue
  label: string
  icon: Component
}

export type StageMeta = {
  label: string
  color: string
  activeDot: string
  idleDot: string
}

export type DashboardStageCard = {
  stage: StageKey
  label: string
  count: number
  color: string
}
