import { compileOFAuthoringTomlDocumentToWorkflow, parseOFAuthoringToml } from '@shared/Orchestraflow-types'

export function compileDesignDocumentTomlToWorkflow(raw: string) {
  const parsed = parseOFAuthoringToml(raw)
  if (!parsed.document) {
    return {
      runnable: null,
      diagnostics: parsed.diagnostics
    }
  }

  return {
    runnable: compileOFAuthoringTomlDocumentToWorkflow(parsed.document),
    diagnostics: []
  }
}
