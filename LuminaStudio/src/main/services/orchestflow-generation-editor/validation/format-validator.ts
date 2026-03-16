import { parseOFAuthoringToml } from '@shared/Orchestraflow-types'

export function runFormatValidation(raw: string) {
  return parseOFAuthoringToml(raw)
}
