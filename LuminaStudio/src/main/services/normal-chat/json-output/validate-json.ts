import { z } from 'zod'

export interface ValidateJsonResult<T> {
  parsedJson: T | null
  validationError: string | null
}

export function validateJsonObject<T>(
  rawValue: unknown,
  schema: z.ZodType<T>
): ValidateJsonResult<T> {
  const parsed = schema.safeParse(rawValue)
  if (parsed.success) {
    return {
      parsedJson: parsed.data,
      validationError: null
    }
  }

  return {
    parsedJson: null,
    validationError: parsed.error.issues.map((issue) => issue.message).join('; ')
  }
}
