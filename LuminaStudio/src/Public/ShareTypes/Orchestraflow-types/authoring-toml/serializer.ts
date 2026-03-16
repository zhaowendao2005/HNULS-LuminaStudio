import { stringify as stringifyToml } from 'smol-toml'
import type { OFAuthoringTomlDocument } from './types'

export function stringifyOFAuthoringToml(document: OFAuthoringTomlDocument): string {
  return stringifyToml({
    workflow: document.workflow,
    nodes: document.nodes,
    edges: document.edges
  })
}
