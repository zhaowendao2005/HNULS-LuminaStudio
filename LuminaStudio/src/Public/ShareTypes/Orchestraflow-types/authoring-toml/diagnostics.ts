import type { OFAuthoringTomlDiagnostic, OFAuthoringTomlDiagnosticCategory } from './types'

export function createAuthoringTomlDiagnostic(params: {
  category: OFAuthoringTomlDiagnosticCategory
  code: string
  message: string
  nodeId?: string
  path?: string
}): OFAuthoringTomlDiagnostic {
  return {
    category: params.category,
    code: params.code,
    message: params.message,
    nodeId: params.nodeId,
    path: params.path
  }
}
