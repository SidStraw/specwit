import Ajv2020 from 'ajv/dist/2020.js'
import type { Contract, Issue, Run } from './model'
import { duplicates } from './contract'
import { readJson } from './files'
import { reviewEnvelopeSchema } from './model'

export function reviewIssues(root: string, contract: Contract, run: Run, payload: unknown): Issue[] {
  const issues: Issue[] = []
  const add = (code: string, message: string): void => { issues.push({ code, message }) }
  const parsed = reviewEnvelopeSchema.safeParse(payload)
  if (!parsed.success) return [{ code: 'INVALID_REVIEW', message: 'review envelope／response 格式無效。' }]
  const review = parsed.data
  if (review.taskId !== run.taskId || review.runId !== run.runId || review.planDigest !== run.planDigest || review.candidateDigest !== run.candidateDigest)
    add('REVIEW_IDENTITY_MISMATCH', 'review 不屬於指定 Task／Run／plan／Candidate。')
  try {
    const validator = new Ajv2020({ strict: true, allErrors: true }).compile(readJson(root, contract.review.schemaRef) as object)
    if (!validator(review.response)) add('REVIEW_SCHEMA_FAILED', 'review response 未通過專案 JSON Schema。')
  }
  catch { add('INVALID_REVIEW_SCHEMA', '無法載入或驗證 review JSON Schema。') }
  const expected = contract.review.criteria.map(item => item.id)
  const actual = review.response.assessments.map(item => item.criterionId)
  for (const id of duplicates(actual)) add('DUPLICATE_CRITERION', `重複 criterion：${id}`)
  for (const id of expected) if (!actual.includes(id)) add('MISSING_CRITERION', `缺少 criterion：${id}`)
  for (const assessment of review.response.assessments) {
    if (!expected.includes(assessment.criterionId)) add('UNKNOWN_CRITERION', `未知 criterion：${assessment.criterionId}`)
    if (assessment.verdict === 'unknown' ? assessment.confidence !== null : assessment.confidence === null)
      add('INVALID_CONFIDENCE', `${assessment.criterionId} 的 confidence 與 verdict 不一致。`)
    if (assessment.verdict !== 'unknown' && !assessment.evidenceIds.length)
      add('MISSING_EVIDENCE', `${assessment.criterionId} 的結論沒有引用證據。`)
    if (duplicates(assessment.evidenceIds).length) add('DUPLICATE_EVIDENCE', 'review 包含重複 evidence ID。')
    for (const id of assessment.evidenceIds) {
      if (!run.checks.some(check => `check:${check.checkId}` === id && check.observations.length > 0))
        add('UNKNOWN_EVIDENCE', `不存在的該次 Run 證據：${id}`)
    }
  }
  return issues
}
