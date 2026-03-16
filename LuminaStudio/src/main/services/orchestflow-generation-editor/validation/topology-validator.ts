import { validateOFAuthoringToml } from '@shared/Orchestraflow-types'
import type { OFAuthoringTomlDocument } from '@shared/Orchestraflow-types'

export function runTopologyValidation(document: OFAuthoringTomlDocument) {
  return validateOFAuthoringToml(document).diagnostics.filter(
    (item) => item.category === 'topology'
  )
}
