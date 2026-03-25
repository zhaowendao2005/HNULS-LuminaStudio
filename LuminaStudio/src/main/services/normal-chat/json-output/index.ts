import { z } from 'zod'
import { extractJsonText } from './extract-json'
import { repairJsonText } from './repair-json'
import { validateJsonObject } from './validate-json'

export * from './constraint-prompt'
export * from './extract-json'
export * from './repair-json'
export * from './validate-json'

export interface ParseJsonContractOutputResult<T> {
  rawText: string
  extractedText: string | null
  repairedText: string | null
  parsedJson: T | null
  repairAttempted: boolean
  validationError: string | null
}

export function parseJsonContractOutput<T>(
  rawText: string,
  schema: z.ZodType<T>
): ParseJsonContractOutputResult<T> {
  const extractedText = extractJsonText(rawText)
  let parsedValue: unknown = null
  let repairedText: string | null = null
  let repairAttempted = false
  let validationError: string | null = null

  try {
    parsedValue = extractedText ? JSON.parse(extractedText) : null
  } catch (initialError) {
    const repairResult = repairJsonText(extractedText)
    repairedText = repairResult.repairedText
    repairAttempted = repairResult.repairAttempted

    if (!repairResult.repairedText) {
      validationError =
        repairResult.repairError ??
        (initialError instanceof Error ? initialError.message : String(initialError))
      return {
        rawText,
        extractedText,
        repairedText,
        parsedJson: null,
        repairAttempted,
        validationError
      }
    }

    try {
      parsedValue = JSON.parse(repairResult.repairedText)
    } catch (repairParseError) {
      validationError =
        repairParseError instanceof Error ? repairParseError.message : String(repairParseError)
      return {
        rawText,
        extractedText,
        repairedText,
        parsedJson: null,
        repairAttempted,
        validationError
      }
    }
  }

  const validateResult = validateJsonObject(parsedValue, schema)
  validationError = validateResult.validationError

  return {
    rawText,
    extractedText,
    repairedText,
    parsedJson: validateResult.parsedJson,
    repairAttempted,
    validationError
  }
}
