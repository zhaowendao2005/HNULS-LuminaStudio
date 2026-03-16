import type { GenerationValidationDiagnostic } from '@preload/types'
import type { OFAuthoringTomlDiagnostic } from '@shared/Orchestraflow-types'

export function mapAuthoringDiagnostics(
  diagnostics: OFAuthoringTomlDiagnostic[]
): GenerationValidationDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    category: diagnostic.category,
    code: diagnostic.code,
    message: diagnostic.message,
    nodeId: diagnostic.nodeId,
    path: diagnostic.path
  }))
}
