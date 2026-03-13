import { parseOFPlanningCommandDsl, type OFPlanningCommandMode } from '@shared/Orchestraflow-types'
import type { CopilotEditorModelResult } from './types'
import { COPILOT_EDITOR_DSL_END_MARKER, COPILOT_EDITOR_DSL_START_MARKER } from './dsl'

export interface ValidatedCopilotEditorModelResult extends CopilotEditorModelResult {
  parsedDsl: ReturnType<typeof parseOFPlanningCommandDsl>
  isValid: boolean
  validationError: string | null
}

export function validateCopilotEditorModelResult(
  result: CopilotEditorModelResult
): ValidatedCopilotEditorModelResult {
  const parsedDsl = parseOFPlanningCommandDsl(result.commandDsl)
  const validationError =
    parsedDsl.errors.length > 0
      ? parsedDsl.errors.map((error) => error.message).join('；')
      : result.commandDsl
        ? null
        : `输出缺少 DSL marker：${COPILOT_EDITOR_DSL_START_MARKER} / ${COPILOT_EDITOR_DSL_END_MARKER}`

  return {
    ...result,
    parsedDsl,
    isValid: Boolean(result.commandDsl) && parsedDsl.errors.length === 0,
    validationError
  }
}

export function resolveInitialStatus(params: {
  mode: OFPlanningCommandMode
  autoApproved: boolean
  isValid: boolean
}): 'noop' | 'pending' | 'applied' | 'failed' {
  // 这里先把“DSL 是否有效”作为第一判断条件，避免非法命令继续流到 apply/pending 分支。
  if (!params.isValid) {
    return 'failed'
  }
  if (params.mode === 'noop') {
    return 'noop'
  }
  return params.autoApproved ? 'applied' : 'pending'
}
