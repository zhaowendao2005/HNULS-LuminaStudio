import type { OFPlanningPatch } from './types'

export function validateOFPlanningPatch(patch: OFPlanningPatch): string[] {
  const errors: string[] = []
  if (!patch.content.trim()) {
    errors.push('planning patch content 不能为空')
  }
  if (!['replace-analysis', 'append-analysis'].includes(patch.action)) {
    errors.push(`未知 planning patch action: ${patch.action}`)
  }
  return errors
}
