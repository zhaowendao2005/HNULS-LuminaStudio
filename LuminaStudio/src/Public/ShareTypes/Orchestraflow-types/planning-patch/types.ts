export type OFPlanningPatchAction = 'replace-analysis' | 'append-analysis'

export interface OFPlanningPatch {
  action: OFPlanningPatchAction
  content: string
}
