import type { OFNodeDebugRunParams, OFNodeDebugResult } from '@shared/Orchestraflow-types'

function toPlainObject(value: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!value) return undefined
  return JSON.parse(JSON.stringify(value))
}

export const NodeDebugDataSource = {
  async run(params: OFNodeDebugRunParams): Promise<OFNodeDebugResult> {
    const res = await window.api.orchestraflow.runNodeDebug({
      workflowId: params.workflowId,
      nodeId: params.nodeId,
      inputs: toPlainObject(params.inputs)
    })
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to run node debug')
    }
    return res.data
  }
}
