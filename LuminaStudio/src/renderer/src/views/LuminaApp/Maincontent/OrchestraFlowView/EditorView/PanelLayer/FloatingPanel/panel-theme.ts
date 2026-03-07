export type OFPanelTheme = {
  iconBgClass: string
  tabActiveClass: string
  controlFocusClass: string
  softBadgeClass: string
}

export const OF_PANEL_THEME: Record<
  'start' | 'llm' | 'iteration' | 'ifelse' | 'variableAssign' | 'end',
  OFPanelTheme
> = {
  start: {
    iconBgClass: 'bg-emerald-500',
    tabActiveClass: 'border-emerald-500 text-gray-900',
    controlFocusClass: 'focus:border-emerald-400 hover:border-emerald-300',
    softBadgeClass: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  llm: {
    iconBgClass: 'bg-indigo-500',
    tabActiveClass: 'border-indigo-500 text-gray-900',
    controlFocusClass: 'focus:border-indigo-400 hover:border-indigo-300',
    softBadgeClass: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  iteration: {
    iconBgClass: 'bg-cyan-500',
    tabActiveClass: 'border-cyan-500 text-gray-900',
    controlFocusClass: 'focus:border-cyan-400 hover:border-cyan-300',
    softBadgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200'
  },
  ifelse: {
    iconBgClass: 'bg-cyan-500',
    tabActiveClass: 'border-cyan-500 text-gray-900',
    controlFocusClass: 'focus:border-cyan-400 hover:border-cyan-300',
    softBadgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200'
  },
  variableAssign: {
    iconBgClass: 'bg-sky-500',
    tabActiveClass: 'border-sky-500 text-gray-900',
    controlFocusClass: 'focus:border-sky-400 hover:border-sky-300',
    softBadgeClass: 'text-sky-700 bg-sky-50 border-sky-200'
  },
  end: {
    iconBgClass: 'bg-amber-500',
    tabActiveClass: 'border-amber-500 text-gray-900',
    controlFocusClass: 'focus:border-amber-400 hover:border-amber-300',
    softBadgeClass: 'text-amber-700 bg-amber-50 border-amber-200'
  }
}
