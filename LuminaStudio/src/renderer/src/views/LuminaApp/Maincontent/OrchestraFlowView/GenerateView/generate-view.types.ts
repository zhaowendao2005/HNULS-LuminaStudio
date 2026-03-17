import type { LucideIcon } from 'lucide-vue-next'

export type MenuValue = 'dashboard' | 'sessions' | 'analysis' | 'design' | 'settings'
export type StageKey = 'analysis' | 'design'
export type CopilotMode = 'analysis' | 'design'
export type RightPanel = CopilotMode | null

export interface MenuItem {
  value: MenuValue
  label: string
  icon: LucideIcon
}

export interface DashboardStageCard {
  stageKey: StageKey
  title: string
  count: number
  color: string
}
