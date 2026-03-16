export interface RunCompileWorkflowActionParams {
  compileToWorkflow: () => Promise<string | null>
  openWorkflow: (workflowId: string) => void
  reportError: (message: string) => void
}

export async function runCompileWorkflowAction(
  params: RunCompileWorkflowActionParams
): Promise<void> {
  try {
    const workflowId = await params.compileToWorkflow()
    if (!workflowId) {
      params.reportError('当前没有可编译的设计稿。')
      return
    }
    params.openWorkflow(workflowId)
  } catch (error) {
    params.reportError(error instanceof Error ? error.message : '编译工作流失败。')
  }
}
