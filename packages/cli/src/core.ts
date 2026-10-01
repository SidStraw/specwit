import { randomUUID } from 'node:crypto'
import { closeSync, mkdirSync, openSync, readdirSync, unlinkSync } from 'node:fs'
import { z } from 'zod'
import type { Inspection } from './contract'
import type { Issue, Run } from './model'
import { duplicates, inspect } from './contract'
import { hasFile, readJson, safePath, writeJson } from './files'
import { SpecWitError, parse, reviewEnvelopeSchema, runSchema } from './model'
import { reviewIssues } from './review'
import { executeCheck } from './runner'
import { VERSION } from './version'

export interface Report {
  schemaVersion: 1
  command: string
  taskId: string
  assurance: 'Observe'
  eligible: false
  state: string
  issues: Issue[]
  exitCode: number
  planDigest?: string
  candidateDigest?: string | null
  run?: Run
  humanPending?: Issue[]
  cleanupPreview?: { deleteAfterExternalApproval: string[], preserve: string[], executed: false }
  limitations: string[]
}

const limitations = [
  'Observe checks confirmation and decision source existence and versions, not operator identity.',
  'Before/after digests of declared inputs are not immutable snapshots and cannot detect changes reverted during execution.',
  'Runner and results are not isolated or signed; no automatic acceptance, CI publisher, or finalization authority is provided.',
]

function report(command: string, taskId: string, state: string, issues: Issue[], exitCode: number, extra: Partial<Report> = {}): Report {
  return { schemaVersion: 1, command, taskId, assurance: 'Observe', eligible: false, state, issues, exitCode, limitations, ...extra }
}

export function check(root: string, taskId: string): Report {
  const inspection = inspect(root, taskId)
  return report('check', taskId, inspection.blockers.length ? 'BLOCKED' : 'READY', inspection.blockers, inspection.blockers.length ? 2 : 0, {
    planDigest: inspection.planDigest,
    candidateDigest: inspection.candidateDigest,
    humanPending: inspection.humanPending,
  })
}

function runRef(inspection: Inspection, runId: string): string {
  if (!z.uuid().safeParse(runId).success) throw new SpecWitError('INVALID_RUN_ID', 'Run ID must be a UUID.')
  return `${inspection.runtimeRef}/${runId}/run.json`
}

function loadRun(root: string, inspection: Inspection, runId?: string): Run | null {
  const latestRef = `${inspection.runtimeRef}/latest.json`
  if (!runId) {
    if (!hasFile(root, latestRef)) return null
    runId = parse(z.strictObject({ runId: z.uuid() }), readJson(root, latestRef), latestRef).runId
  }
  const ref = runRef(inspection, runId)
  const run = parse(runSchema, readJson(root, ref), ref)
  if (run.runId !== runId || run.taskId !== inspection.contract.taskId) throw new SpecWitError('RUN_IDENTITY_MISMATCH', 'Run identity does not match its path.')
  return run
}

function assess(root: string, taskId: string, inspection: Inspection, run: Run | null): Report {
  const issues = [...inspection.blockers]
  const extra = { planDigest: inspection.planDigest, candidateDigest: inspection.candidateDigest, humanPending: inspection.humanPending }
  if (!run) return report('status', taskId, 'NOT_RUN', [...issues, { code: 'NOT_RUN', message: 'No verification Run exists.' }], 2, extra)
  if (run.planDigest !== inspection.planDigest || run.candidateDigest !== inspection.candidateDigest)
    return report('status', taskId, 'STALE', [...issues, { code: 'STALE', message: 'Plan, declared inputs, confirmation data, or execution environment changed.' }], 2, { ...extra, run })
  if (run.phase !== 'FINISHED')
    return report('status', taskId, 'INCONCLUSIVE', [...issues, { code: 'INCOMPLETE_RUN', message: 'Run did not finish; partial results cannot establish a pass.' }], 2, { ...extra, run })
  const expected = inspection.contract.expectedChecks
  for (const id of duplicates(run.checks.map(item => item.checkId))) issues.push({ code: 'DUPLICATE_RESULT', message: `Duplicate check result: ${id}` })
  for (const result of run.checks) {
    if (!expected.some(check => check.id === result.checkId)) issues.push({ code: 'UNEXPECTED_RESULT', message: `Unknown check: ${result.checkId}` })
  }
  for (const check of expected) {
    const found = run.checks.find(result => result.checkId === check.id)
    if (!found) issues.push({ code: 'MISSING_RESULT', message: `Missing result for ${check.id}.` })
    else if (check.required && found.verdict !== 'PASS') issues.push({ code: found.verdict, message: `${check.id}：${found.reason || found.verdict}` })
    else if (found.verdict === 'PASS' && (found.exitCode !== 0 || !found.observations.length || found.reason !== null))
      issues.push({ code: 'INVALID_RESULT', message: `${check.id} has an incomplete PASS record.` })
  }
  if (inspection.contract.review.required || run.reviewAttempts.length) {
    const attempt = run.reviewAttempts.at(-1)
    if (!attempt) issues.push({ code: 'REVIEW_NOT_RUN', message: 'Required external review has not been imported.' })
    else {
      const errors = reviewIssues(root, inspection.contract, run, attempt.payload)
      issues.push(...errors)
      if (!errors.length) {
        const envelope = reviewEnvelopeSchema.parse(attempt.payload)
        for (const assessment of envelope.response.assessments) {
          if (assessment.verdict !== 'meets') issues.push({ code: 'REVIEW_UNRESOLVED', message: `${assessment.criterionId}：${assessment.verdict}` })
        }
      }
    }
  }
  issues.push(...inspection.humanPending)
  const state = issues.some(issue => issue.code === 'FAIL') ? 'FAIL' : issues.length ? 'BLOCKED' : 'PASS'
  return report('status', taskId, state, issues, state === 'PASS' ? 0 : state === 'FAIL' ? 1 : 2, { ...extra, run })
}

export function status(root: string, taskId: string, runId?: string): Report {
  const inspection = inspect(root, taskId)
  return assess(root, taskId, inspection, loadRun(root, inspection, runId))
}

async function withLock<T>(root: string, inspection: Inspection, work: () => Promise<T>): Promise<T> {
  const ref = `${inspection.runtimeRef}/.lock`
  const directory = safePath(root, inspection.runtimeRef)
  mkdirSync(directory, { recursive: true })
  const path = safePath(root, ref)
  let fd: number
  try { fd = openSync(path, 'wx', 0o600) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new SpecWitError('TASK_LOCKED', 'Task is locked, possibly by an interrupted process. Confirm the process has stopped before removing .lock.')
    throw error
  }
  try { return await work() }
  finally { closeSync(fd); unlinkSync(safePath(root, ref)) }
}

export async function verify(root: string, taskId: string, options: { runId?: string, reviewRef?: string, signal?: AbortSignal } = {}): Promise<Report> {
  const inspection = inspect(root, taskId)
  if (inspection.blockers.length) return { ...check(root, taskId), command: 'verify' }
  if (!inspection.runner || !inspection.candidateDigest) throw new SpecWitError('INVALID_RUNNER', 'Runner or input digest is missing.')
  return withLock(root, inspection, async () => {
    if (options.reviewRef) {
      if (!options.runId) throw new SpecWitError('RUN_REQUIRED', 'Review import requires --run to identify the exact Run.')
      const run = loadRun(root, inspection, options.runId)!
      if (run.phase !== 'FINISHED' || run.planDigest !== inspection.planDigest || run.candidateDigest !== inspection.candidateDigest)
        throw new SpecWitError('REVIEW_TARGET_INVALID', 'Review requires a finished Run whose version is still current.')
      let payload: unknown = null
      let issues: Issue[]
      try {
        payload = readJson(root, options.reviewRef)
        issues = reviewIssues(root, inspection.contract, run, payload)
      }
      catch {
        issues = [{ code: 'INVALID_REVIEW', message: 'Review JSON is invalid, missing, or unsafe.' }]
      }
      run.reviewAttempts.push({ receivedAt: new Date().toISOString(), payload, issues })
      writeJson(root, runRef(inspection, run.runId), run)
      return { ...assess(root, taskId, inspect(root, taskId), run), command: 'verify' }
    }
    if (options.runId) throw new SpecWitError('REVIEW_REQUIRED', '--run is only for importing --review; rerunning checks creates a new Run.')
    const runs = readdirSync(safePath(root, inspection.runtimeRef)).filter(name => z.uuid().safeParse(name).success)
    if (runs.length >= inspection.contract.execution.maxAttempts!)
      throw new SpecWitError('ATTEMPT_LIMIT', 'Task reached maxAttempts; explicitly revise and reconfirm the plan before raising the limit.')
    const run: Run = {
      schemaVersion: 1, toolVersion: VERSION, assurance: 'Observe', taskId, runId: randomUUID(),
      startedAt: new Date().toISOString(), finishedAt: null, phase: 'RUNNING',
      planDigest: inspection.planDigest, candidateDigest: inspection.candidateDigest!,
      materials: inspection.materials, checks: [], reviewAttempts: [],
    }
    writeJson(root, runRef(inspection, run.runId), run)
    writeJson(root, `${inspection.runtimeRef}/latest.json`, { runId: run.runId })
    try {
      for (const check of inspection.runner!.checks) {
        if (options.signal?.aborted) break
        run.checks.push(await executeCheck(root, taskId, run.runId, check, inspection.contract.execution.timeoutSeconds!, options.signal))
        writeJson(root, runRef(inspection, run.runId), run)
      }
      run.phase = options.signal?.aborted ? 'INTERRUPTED' : 'FINISHED'
    }
    catch (error) {
      run.phase = 'INTERRUPTED'
      throw error
    }
    finally {
      run.finishedAt = new Date().toISOString()
      writeJson(root, runRef(inspection, run.runId), run)
    }
    return { ...assess(root, taskId, inspect(root, taskId), run), command: 'verify' }
  })
}

export function complete(root: string, taskId: string): Report {
  const inspection = inspect(root, taskId)
  const current = assess(root, taskId, inspection, loadRun(root, inspection))
  const issues = [...current.issues, { code: 'EXTERNAL_FINALIZER_REQUIRED', message: 'Preview only: trusted finalization and permission isolation are unavailable; task data will not be deleted.' }]
  const planned: string[] = []
  for (const [value, expected] of [
    [inspection.contract.cleanup.ownedChange, inspection.changeRef],
    [inspection.contract.cleanup.ownedRuntime, inspection.runtimeRef],
  ]) {
    if (value?.replace(/\/$/, '') !== expected) issues.push({ code: 'UNSAFE_CLEANUP_SCOPE', message: 'Cleanup must exactly match this Task’s change and runtime directories.' })
    else {
      safePath(root, expected!)
      planned.push(expected!)
    }
  }
  if (inspection.contract.completionTarget === 'CI') issues.push({ code: 'WAITING_FOR_CI', message: 'A fresh CI Run and external explicit finalization are required.' })
  return report('complete', taskId, 'BLOCKED_EXTERNAL', issues, 2, {
    planDigest: inspection.planDigest,
    candidateDigest: inspection.candidateDigest,
    cleanupPreview: { deleteAfterExternalApproval: planned, preserve: inspection.contract.cleanup.preserve, executed: false },
  })
}
