import type { LucideIcon } from 'lucide-vue-next'

export type StageKey = 'analysis' | 'design'

export interface MenuItem {
  value: 'sessions' | 'analysis' | 'design' | 'settings'
  label: string
  icon: LucideIcon
}
