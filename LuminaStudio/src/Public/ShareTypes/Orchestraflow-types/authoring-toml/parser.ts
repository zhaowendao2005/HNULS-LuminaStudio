import { parse as parseToml } from 'smol-toml'
import { createAuthoringTomlDiagnostic } from './diagnostics'
import type { OFAuthoringTomlDocument, OFAuthoringTomlParseResult } from './types'

export function parseOFAuthoringToml(raw: string): OFAuthoringTomlParseResult {
  try {
    const parsed = parseToml(raw) as Record<string, unknown>
    const workflow = (parsed.workflow || {}) as Record<string, unknown>
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
    const edges = Array.isArray(parsed.edges) ? parsed.edges : []

    const document: OFAuthoringTomlDocument = {
      workflow: {
        name: String(workflow.name || '未命名工作流'),
        description: workflow.description ? String(workflow.description) : undefined
      },
      nodes: nodes.map((node) => ({
        ...(node as Record<string, unknown>)
      })) as unknown as OFAuthoringTomlDocument['nodes'],
      edges: edges.map((edge) => ({
        ...(edge as Record<string, unknown>)
      })) as unknown as OFAuthoringTomlDocument['edges']
    }

    return {
      document,
      diagnostics: []
    }
  } catch (error) {
    return {
      document: null,
      diagnostics: [
        createAuthoringTomlDiagnostic({
          category: 'syntax',
          code: 'toml-parse-failed',
          message: error instanceof Error ? error.message : 'TOML 解析失败'
        })
      ]
    }
  }
}
