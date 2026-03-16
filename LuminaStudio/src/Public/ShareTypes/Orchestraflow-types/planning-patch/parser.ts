import { parse as parseToml } from 'smol-toml'
import type { OFPlanningPatch } from './types'

export function parseOFPlanningPatchToml(raw: string): OFPlanningPatch {
  const parsed = parseToml(raw) as Record<string, unknown>
  return {
    action: String(parsed.action || 'replace-analysis') as OFPlanningPatch['action'],
    content: String(parsed.content || '')
  }
}
