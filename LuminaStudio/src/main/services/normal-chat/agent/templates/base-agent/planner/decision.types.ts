import { z } from 'zod'

export const childTaskSchema = z.object({
  roleKind: z.enum(['worker', 'repair']),
  taskKind: z.enum(['tool-research', 'repair', 'synthesis', 'direct-answer']),
  goal: z.string().trim().min(1),
  summary: z.string().trim().min(1)
})

export const plannerDecisionSchema = z.object({
  action: z.enum(['answer', 'call-helper', 'dispatch-child', 'fallback']),
  reasoning: z.string().trim().min(1).default(''),
  helperId: z.string().trim().nullable().optional(),
  helperArgs: z.record(z.string(), z.unknown()).nullable().optional(),
  childTask: childTaskSchema.nullable().optional(),
  finalAnswerHint: z.string().trim().nullable().optional()
})

export const slowPlanSchema = z.object({
  action: z.enum(['answer', 'call-helper', 'dispatch-child', 'fallback']),
  reasoning: z.string().trim().min(1).default(''),
  helperId: z.string().trim().nullable().optional(),
  childTask: childTaskSchema.nullable().optional(),
  finalAnswerHint: z.string().trim().nullable().optional()
})

export const helperArgsEnvelopeSchema = z.object({
  helperId: z.string().trim().min(1),
  query: z.string().trim().optional(),
  topK: z.number().int().optional(),
  sort: z.enum(['relevance', 'pub_date']).optional(),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional()
})
