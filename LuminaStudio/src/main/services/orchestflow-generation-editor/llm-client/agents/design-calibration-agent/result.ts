import {
  buildOFBlueprintDiagnosticSignature,
  compileOFBlueprintTextDsl
} from '@shared/Orchestraflow-types'
import type { GenerationDesignCalibrationProposalPayload } from '@preload/types'
import type { DesignCalibrationModelResult } from './types'

export interface ValidatedDesignCalibrationModelResult extends DesignCalibrationModelResult {
  isValid: boolean
  validationError: string | null
  diagnostics: ReturnType<typeof compileOFBlueprintTextDsl>['diagnostics']
}

export function validateDesignCalibrationModelResult(params: {
  result: DesignCalibrationModelResult
  currentContentHash: string
}): ValidatedDesignCalibrationModelResult {
  if (!params.result.replacementDsl.trim()) {
    return {
      ...params.result,
      isValid: false,
      validationError: '输出缺少可用的 replacement DSL。',
      diagnostics: []
    }
  }

  const compileResult = compileOFBlueprintTextDsl(params.result.replacementDsl)
  if (!compileResult.ast) {
    return {
      ...params.result,
      isValid: false,
      validationError: 'replacement DSL 解析失败，无法形成有效 AST。',
      diagnostics: compileResult.diagnostics
    }
  }

  return {
    ...params.result,
    isValid: true,
    validationError: null,
    diagnostics: compileResult.diagnostics
  }
}

export function buildDesignCalibrationProposal(params: {
  baseContentHash: string
  summary: string
  replacementDsl: string
  totalDiagnostics: ReturnType<typeof compileOFBlueprintTextDsl>['diagnostics']
  remainingDiagnostics: ReturnType<typeof compileOFBlueprintTextDsl>['diagnostics']
  truncatedTailDiscarded: boolean
}): GenerationDesignCalibrationProposalPayload {
  return {
    strategy: 'replace-document',
    summary: params.summary,
    baseContentHash: params.baseContentHash,
    targetDiagnosticSignatures: params.totalDiagnostics.map(buildOFBlueprintDiagnosticSignature),
    coveredDiagnosticSignatures: params.totalDiagnostics
      .map(buildOFBlueprintDiagnosticSignature)
      .filter((signature) => {
        return !params.remainingDiagnostics
          .map(buildOFBlueprintDiagnosticSignature)
          .includes(signature)
      }),
    remainingDiagnosticSignatures: params.remainingDiagnostics.map(
      buildOFBlueprintDiagnosticSignature
    ),
    operations: [],
    replacementDsl: params.replacementDsl,
    previewDsl: params.replacementDsl,
    truncatedTailDiscarded: params.truncatedTailDiscarded
  }
}
