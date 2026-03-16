import { validateOFAuthoringToml } from '@shared/Orchestraflow-types'
import type { OFAuthoringTomlDocument } from '@shared/Orchestraflow-types'

export function runFieldValidation(document: OFAuthoringTomlDocument) {
  return validateOFAuthoringToml(document).diagnostics.filter((item) => item.category === 'field')
}
