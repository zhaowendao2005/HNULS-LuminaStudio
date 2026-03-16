import { stringify as stringifyToml } from 'smol-toml'
import type { OFPlanningPatch } from './types'

export function stringifyOFPlanningPatchToml(patch: OFPlanningPatch): string {
  return stringifyToml(patch)
}
