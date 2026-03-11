import type {
  OFEdgeContract,
  OFFieldContract,
  OFInvariantContract,
  OFSelectorContract
} from '../contract'

export type OFMechanismTheme =
  | 'variables'
  | 'selector-ref'
  | 'edge-handle'
  | 'container'
  | 'blueprint-syntax'

export interface OFMechanismRuleExample {
  label: string
  value: string
}

export interface OFMechanismDefinition {
  id: string
  theme: OFMechanismTheme
  title: string
  summary: string
  hard_rules: string[]
  examples: OFMechanismRuleExample[]
  failure_modes: string[]
  agent_render_hints: string[]
  helper_refs: string[]
  selector_contract?: OFSelectorContract
  edge_contract?: OFEdgeContract
  global_fields?: OFFieldContract[]
  global_invariants?: OFInvariantContract[]
}

export interface OFMechanismRegistry {
  resolve(id: string): OFMechanismDefinition
  list(): OFMechanismDefinition[]
}
