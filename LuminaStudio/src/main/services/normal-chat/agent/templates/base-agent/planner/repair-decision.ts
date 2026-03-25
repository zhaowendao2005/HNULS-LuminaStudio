import type { z } from 'zod'
import { parseDecisionWithSchema } from './parse-decision'

export function repairDecisionWithSchema<T>(rawText: string, schema: z.ZodType<T>) {
  return parseDecisionWithSchema(rawText, schema)
}
