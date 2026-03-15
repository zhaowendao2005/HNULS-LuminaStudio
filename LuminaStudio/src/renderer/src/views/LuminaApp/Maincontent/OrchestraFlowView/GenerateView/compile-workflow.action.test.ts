import { describe, expect, it, vi } from 'vitest'
import { runCompileWorkflowAction } from './compile-workflow.action'

describe('compile-workflow.action', () => {
  it('opens the workflow after compile succeeds', async () => {
    const openWorkflow = vi.fn()
    const reportError = vi.fn()
    const confirmForceImport = vi.fn()

    await runCompileWorkflowAction({
      compileToWorkflow: vi.fn().mockResolvedValue({
        workflowId: 'workflow-1',
        designDocument: {} as never,
        mode: 'strict',
        recoverySummary: null
      }),
      confirmForceImport,
      openWorkflow,
      reportError
    })

    expect(openWorkflow).toHaveBeenCalledWith('workflow-1')
    expect(reportError).not.toHaveBeenCalled()
    expect(confirmForceImport).not.toHaveBeenCalled()
  })

  it('falls back to force import after user confirms', async () => {
    const openWorkflow = vi.fn()
    const reportError = vi.fn()
    const compileToWorkflow = vi
      .fn()
      .mockRejectedValueOnce(new Error('当前规划设计稿 DSL 未通过编译校验'))
      .mockResolvedValueOnce({
        workflowId: 'workflow-force-1',
        designDocument: {} as never,
        mode: 'force-draft',
        recoverySummary: null
      })
    const confirmForceImport = vi.fn().mockReturnValue(true)

    await runCompileWorkflowAction({
      compileToWorkflow,
      confirmForceImport,
      openWorkflow,
      reportError
    })

    expect(confirmForceImport).toHaveBeenCalledTimes(1)
    expect(openWorkflow).toHaveBeenCalledWith('workflow-force-1')
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports error and does not force import for non-recoverable failures', async () => {
    const openWorkflow = vi.fn()
    const reportError = vi.fn()
    const confirmForceImport = vi.fn()

    await runCompileWorkflowAction({
      compileToWorkflow: vi.fn().mockRejectedValue(new Error('当前规划设计稿 DSL 为空，无法编译为工作流。')),
      confirmForceImport,
      openWorkflow,
      reportError
    })

    expect(openWorkflow).not.toHaveBeenCalled()
    expect(confirmForceImport).not.toHaveBeenCalled()
    expect(reportError).toHaveBeenCalledWith('当前规划设计稿 DSL 为空，无法编译为工作流。')
  })
})
