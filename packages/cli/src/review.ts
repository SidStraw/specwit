import Ajv2020 from 'ajv/dist/2020.js'
import type { Contract, Issue, Run } from './model'
import { duplicates } from './contract'
import { readJson } from './files'
import { reviewEnvelopeSchema } from './model'

export function reviewIssues(root: string, contract: Contract, run: Run, payload: unknown): Issue[] {
  const issues: Issue[] = []
  const add = (code: string, message: string): void => { issues.push({ code, message }) }
  const parsed = reviewEnvelopeSchema.safeParse(payload)
  if (!parsed.success) return [{ code: 'INVALID_REVIEW', message: 'Invalid review envelope or response.' }]
  const review = parsed.data
  if (review.taskId !== run.taskId || review.runId !== run.runId || review.planDigest !== run.planDigest || review.candidateDigest !== run.candidateDigest)
    add('REVIEW_IDENTITY_MISMATCH', 'Review does not match the Task, Run, plan, and candidate.')
  try {
    const validator = new Ajv2020({ strict: true, allErrors: true }).compile(readJson(root, contract.review.schemaRef) as object)
    if (!validator(review.response)) add('REVIEW_SCHEMA_FAILED', 'Review response failed the project JSON Schema.')
  }
  catch { add('INVALID_REVIEW_SCHEMA', 'Cannot load or validate the review JSON Schema.') }
  const expected = contract.review.criteria.map(item => item.id)
  const actual = review.response.assessments.map(item => item.criterionId)
  for (const id of duplicates(actual)) add('DUPLICATE_CRITERION', `Duplicate criterion: ${id}`)
  for (const id of expected) if (!actual.includes(id)) add('MISSING_CRITERION', `Missing criterion: ${id}`)
  for (const assessment of review.response.assessments) {
    if (!expected.includes(assessment.criterionId)) add('UNKNOWN_CRITERION', `Unknown criterion: ${assessment.criterionId}`)
    if (assessment.verdict === 'unknown' ? assessment.confidence !== null : assessment.confidence === null)
      add('INVALID_CONFIDENCE', `${assessment.criterionId}: confidence does not match the verdict.`)
    if (assessment.verdict !== 'unknown' && !assessment.evidenceIds.length)
      add('MISSING_EVIDENCE', `${assessment.criterionId}: the conclusion cites no evidence.`)
    if (duplicates(assessment.evidenceIds).length) add('DUPLICATE_EVIDENCE', 'Review contains duplicate evidence IDs.')
    for (const id of assessment.evidenceIds) {
      if (!run.checks.some(check => `check:${check.checkId}` === id && check.observations.length > 0))
        add('UNKNOWN_EVIDENCE', `Evidence does not exist in this Run: ${id}`)
    }
  }
  return issues
}
