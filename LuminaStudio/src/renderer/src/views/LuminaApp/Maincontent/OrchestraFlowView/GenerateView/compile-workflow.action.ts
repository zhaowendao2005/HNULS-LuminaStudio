export interface RunCompileWorkflowActionParams {
  compileToWorkflow: () => Promise<string>
  openWorkflow: (workflowId: string) => void
  reportError: (message: string) => void
}

export async function runCompileWorkflowAction(
  params: RunCompileWorkflowActionParams
): Promise<void> {
  try {
    const workflowId = await params.compileToWorkflow()
    params.openWorkflow(workflowId)
  } catch (error) {
    params.reportError(buildCompileWorkflowErrorMessage(error))
  }
}

export function buildCompileWorkflowErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '将规划设计稿编译为工作流失败，请重试。'
}
