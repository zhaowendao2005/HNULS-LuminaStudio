import type { Component } from 'vue'

export type MenuValue = 'dashboard' | 'sessions' | 'analysis' | 'design' | 'verify' | 'settings'
export type StageKey = 'analysis' | 'design' | 'verify'
export type CopilotMode = 'analysis' | 'design' | 'verify'
export type RightPanel = CopilotMode | null

export type DiffLine = {
  num: number | null
  type: 'context'
  text: string
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
