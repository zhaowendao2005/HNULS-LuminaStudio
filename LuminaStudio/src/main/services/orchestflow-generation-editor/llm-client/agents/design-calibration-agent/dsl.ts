import { compileOFBlueprintTextDsl } from '@shared/Orchestraflow-types'

export const DESIGN_CALIBRATION_DSL_START_MARKER = '<LUMINA_DESIGN_CALIBRATION_DSL>'
export const DESIGN_CALIBRATION_DSL_END_MARKER = '</LUMINA_DESIGN_CALIBRATION_DSL>'

export function extractVisibleTextAndReplacementDsl(rawText: string): {
  visibleText: string
  replacementDsl: string
  truncatedTailDiscarded: boolean
} {
  const startIndex = rawText.indexOf(DESIGN_CALIBRATION_DSL_START_MARKER)
  if (startIndex < 0) {
    return {
      visibleText: rawText.trim(),
      replacementDsl: '',
      truncatedTailDiscarded: false
    }
  }

  const visibleText = rawText.slice(0, startIndex).trim()
  const bodyStartIndex = startIndex + DESIGN_CALIBRATION_DSL_START_MARKER.length
  const endIndex = rawText.indexOf(DESIGN_CALIBRATION_DSL_END_MARKER, bodyStartIndex)

  if (endIndex >= 0) {
    return {
      visibleText,
      replacementDsl: rawText.slice(bodyStartIndex, endIndex).trim(),
      truncatedTailDiscarded: false
    }
  }

  const salvaged = salvageTruncatedReplacementDsl(rawText.slice(bodyStartIndex).trim())
  return {
    visibleText,
    replacementDsl: salvaged.replacementDsl,
    truncatedTailDiscarded: salvaged.truncatedTailDiscarded
  }
}

function salvageTruncatedReplacementDsl(rawDsl: string): {
  replacementDsl: string
  truncatedTailDiscarded: boolean
} {
  const lines = rawDsl.replace(/\r\n?/g, '\n').split('\n')
  let fallbackCandidate = ''
  let fallbackDiscarded = false

  for (let cursor = lines.length; cursor > 0; cursor -= 1) {
    const candidate = lines.slice(0, cursor).join('\n').trim()
    if (!candidate) {
      continue
    }
    if (!candidate.startsWith('OFT/1')) {
      continue
    }

    const compileResult = compileOFBlueprintTextDsl(candidate)
    if (compileResult.valid) {
      return {
        replacementDsl: candidate,
        truncatedTailDiscarded: cursor < lines.length
      }
    }

    if (!fallbackCandidate && compileResult.ast) {
      fallbackCandidate = candidate
      fallbackDiscarded = cursor < lines.length
    }
  }

  if (fallbackCandidate) {
    return {
      replacementDsl: fallbackCandidate,
      truncatedTailDiscarded: fallbackDiscarded
    }
  }

  return {
    replacementDsl: '',
    truncatedTailDiscarded: false
  }
}
