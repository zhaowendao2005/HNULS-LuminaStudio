import { describe, expect, it, vi } from 'vitest'
import { runCompileWorkflowAction } from './compile-workflow.action'

describe('compile-workflow.action', () => {
  it('opens the workflow after compile succeeds', async () => {
    const openWorkflow = vi.fn()
    const reportError = vi.fn()

    await runCompileWorkflowAction({
      compileToWorkflow: vi.fn().mockResolvedValue('workflow-1'),
      openWorkflow,
      reportError
    })

    expect(openWorkflow).toHaveBeenCalledWith('workflow-1')
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports error and does not open workflow when compile fails', async () => {
    const openWorkflow = vi.fn()
    const reportError = vi.fn()

    await runCompileWorkflowAction({
      compileToWorkflow: vi.fn().mockRejectedValue(new Error('编译失败')),
      openWorkflow,
      reportError
    })

    expect(openWorkflow).not.toHaveBeenCalled()
    expect(reportError).toHaveBeenCalledWith('编译失败')
  })
})
