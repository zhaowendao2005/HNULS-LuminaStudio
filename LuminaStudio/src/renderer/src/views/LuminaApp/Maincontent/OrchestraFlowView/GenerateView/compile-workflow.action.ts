import type {
  GenerationCompileDesignDocumentToWorkflowResult,
  GenerationDesignWorkflowCompileMode
} from '@preload/types'

export interface RunCompileWorkflowActionParams {
  compileToWorkflow: (
    mode: GenerationDesignWorkflowCompileMode
  ) => Promise<GenerationCompileDesignDocumentToWorkflowResult>
  confirmForceImport: (message: string) => boolean
  openWorkflow: (workflowId: string) => void
  reportError: (message: string) => void
}

export async function runCompileWorkflowAction(
  params: RunCompileWorkflowActionParams
): Promise<void> {
  try {
    const strictResult = await params.compileToWorkflow('strict')
    params.openWorkflow(strictResult.workflowId)
  } catch (error) {
    const errorMessage = buildCompileWorkflowErrorMessage(error)
    if (!isForceImportEligibleErrorMessage(errorMessage)) {
      params.reportError(errorMessage)
      return
    }

    // 这里故意要求人工再确认一次，避免用户在不知情时把局部错误静默丢进 workflow 草稿。
    const confirmed = params.confirmForceImport(buildForceImportConfirmMessage(errorMessage))
    if (!confirmed) {
      return
    }

    try {
      const forceResult = await params.compileToWorkflow('force-draft')
      params.openWorkflow(forceResult.workflowId)
    } catch (forceError) {
      params.reportError(buildCompileWorkflowErrorMessage(forceError))
    }
  }
}

export function buildCompileWorkflowErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '将规划设计稿编译为工作流失败，请重试。'
}

export function isForceImportEligibleErrorMessage(message: string): boolean {
  return message.includes('未通过校验') || message.includes('未通过编译校验')
}

export function buildForceImportConfirmMessage(message: string): string {
  return `${message}\n\n是否忽略局部错误并继续容错导入为工作流草稿？未恢复的片段会被直接跳过。`
}
