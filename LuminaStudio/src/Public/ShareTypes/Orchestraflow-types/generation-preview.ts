import type { OFGenerationGraphSummary } from './generation-graph'

export interface OFGenerationPlanItem {
  id: string
  title: string
  detail: string
  status: 'pending' | 'ready' | 'needs-review'
}

export interface OFGenerationPreview {
  plan: OFGenerationPlanItem[]
  summary: OFGenerationGraphSummary
  topology_text: string[]
}
