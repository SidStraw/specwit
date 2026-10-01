import { z } from 'zod'

const text = z.string().trim().min(1)
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/)
const nullableText = text.nullable()
const resource = z.strictObject({ ref: nullableText, digest: digestSchema.nullable() })
const boundResource = resource.extend({ status: z.enum(['MISSING', 'READY']) })

export const contractSchema = z.strictObject({
  schemaVersion: z.enum(['0.1-example', '0.1']),
  taskId: text,
  completionTarget: z.enum(['LOCAL', 'CI']),
  profile: z.enum(['Observe', 'Controlled', 'Certified candidate']),
  planRevision: z.number().int().positive(),
  planDigest: digestSchema.nullable(),
  sources: z.array(z.strictObject({ id: text, ref: text, version: text, sha256: digestSchema })).min(1),
  confirmation: z.strictObject({
    status: z.enum(['PENDING', 'CONFIRMED']),
    sourceRef: nullableText,
    confirmedPlanDigest: digestSchema.nullable(),
  }),
  policy: resource,
  binding: boundResource,
  verifier: boundResource,
  expectedChecks: z.array(z.strictObject({
    id: text,
    requirementIds: z.array(text).min(1),
    required: z.boolean(),
    mode: z.enum(['PROGRAMMATIC', 'PARTIAL']),
    readiness: z.enum(['MISSING_BINDING', 'READY', 'UNSUPPORTED']),
  })).min(1),
  review: z.strictObject({
    required: z.boolean(),
    schemaRef: text,
    criteria: z.array(z.strictObject({ id: text, description: text })),
  }),
  humanItems: z.array(z.strictObject({
    id: text,
    description: text,
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
    decisionRef: nullableText,
    requirementIds: z.array(text).optional(),
  })),
  execution: z.strictObject({
    candidate: nullableText,
    runId: nullableText,
    maxAttempts: z.number().int().min(1).max(100).nullable(),
    timeoutSeconds: z.number().int().min(1).max(3600).nullable(),
  }),
  cleanup: z.strictObject({
    ownedChange: nullableText,
    ownedRuntime: nullableText,
    preserve: z.array(text),
    finalizer: text,
  }),
})

export const runnerSchema = z.strictObject({
  schemaVersion: z.literal(1),
  inputs: z.array(text).min(1),
  checks: z.array(z.strictObject({ id: text, command: z.array(text).min(1) })).min(1),
})

export const checkOutputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  checkId: text,
  verdict: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE']),
  observations: z.array(text).min(1),
})

export const reviewResponseSchema = z.strictObject({
  schemaVersion: z.literal(1),
  assessments: z.array(z.strictObject({
    criterionId: text,
    verdict: z.enum(['meets', 'does_not_meet', 'unknown']),
    confidence: z.number().min(0).max(1).nullable(),
    rationale: text,
    evidenceIds: z.array(text),
    limitations: z.array(text),
  })).min(1),
})

export const reviewEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  taskId: text,
  runId: z.uuid(),
  planDigest: digestSchema,
  candidateDigest: digestSchema,
  response: reviewResponseSchema,
})

export const issueSchema = z.strictObject({ code: text, message: text })
export type Issue = z.infer<typeof issueSchema>
export type Contract = z.infer<typeof contractSchema>
export type Runner = z.infer<typeof runnerSchema>

export const resultSchema = z.strictObject({
  checkId: text,
  verdict: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE']),
  observations: z.array(text),
  reason: text.nullable(),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().nonnegative(),
})
export type CheckResult = z.infer<typeof resultSchema>

export const runSchema = z.strictObject({
  schemaVersion: z.literal(1),
  toolVersion: z.literal('0.1.0'),
  assurance: z.literal('Observe'),
  taskId: text,
  runId: z.uuid(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  phase: z.enum(['RUNNING', 'FINISHED', 'INTERRUPTED']),
  planDigest: digestSchema,
  candidateDigest: digestSchema,
  materials: z.record(z.string(), digestSchema),
  checks: z.array(resultSchema),
  reviewAttempts: z.array(z.strictObject({
    receivedAt: z.iso.datetime(),
    payload: z.unknown(),
    issues: z.array(issueSchema),
  })),
})
export type Run = z.infer<typeof runSchema>

export class GovError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields = result.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
    throw new GovError('INVALID_DATA', `${label}: ${fields}`)
  }
  return result.data
}
