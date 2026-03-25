import type { z } from 'zod'
import { parseJsonContractOutput } from '../../../../json-output'

export function parseDecisionWithSchema<T>(rawText: string, schema: z.ZodType<T>) {
  return parseJsonContractOutput(rawText, schema)
}
