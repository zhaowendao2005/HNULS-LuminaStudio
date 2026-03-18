export type OFPanelTheme = {
  panelClass: string
  iconBgClass: string
  tabActiveClass: string
  controlFocusClass: string
  softBadgeClass: string
}

export const OF_PANEL_THEME: Record<
  | 'start'
  | 'llm'
  | 'iteration'
  | 'loop'
  | 'ifelse'
  | 'variableAssign'
  | 'knowledgeRetrieval'
  | 'paperRetrieval'
  | 'end',
  OFPanelTheme
> = {
  start: {
    panelClass: 'of-panel-theme-start',
    iconBgClass: 'bg-emerald-500',
    tabActiveClass: 'border-emerald-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  llm: {
    panelClass: 'of-panel-theme-llm',
    iconBgClass: 'bg-indigo-500',
    tabActiveClass: 'border-indigo-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  iteration: {
    panelClass: 'of-panel-theme-iteration',
    iconBgClass: 'bg-cyan-500',
    tabActiveClass: 'border-cyan-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200'
  },
  loop: {
    panelClass: 'of-panel-theme-loop',
    iconBgClass: 'bg-amber-500',
    tabActiveClass: 'border-amber-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-amber-700 bg-amber-50 border-amber-200'
  },
  ifelse: {
    panelClass: 'of-panel-theme-ifelse',
    iconBgClass: 'bg-cyan-500',
    tabActiveClass: 'border-cyan-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200'
  },
  variableAssign: {
    panelClass: 'of-panel-theme-variable-assign',
    iconBgClass: 'bg-sky-500',
    tabActiveClass: 'border-sky-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-sky-700 bg-sky-50 border-sky-200'
  },
  knowledgeRetrieval: {
    panelClass: 'of-panel-theme-knowledge-retrieval',
    iconBgClass: 'bg-blue-500',
    tabActiveClass: 'border-blue-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  paperRetrieval: {
    panelClass: 'of-panel-theme-paper-retrieval',
    iconBgClass: 'bg-emerald-500',
    tabActiveClass: 'border-emerald-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  end: {
    panelClass: 'of-panel-theme-end',
    iconBgClass: 'bg-red-500',
    tabActiveClass: 'border-red-500 text-gray-900',
    controlFocusClass: 'of-theme-control-focus',
    softBadgeClass: 'text-red-700 bg-red-50 border-red-200'
  }
}
