import { randomUUID } from 'node:crypto'
import { closeSync, mkdirSync, openSync, readdirSync, unlinkSync } from 'node:fs'
import { z } from 'zod'
import type { Inspection } from './contract'
import type { Issue, Run } from './model'
import { duplicates, inspect } from './contract'
import { hasFile, readJson, safePath, writeJson } from './files'
import { GovError, parse, reviewEnvelopeSchema, runSchema } from './model'
import { reviewIssues } from './review'
import { executeCheck } from './runner'

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
  'Observe：確認與決策來源僅檢查存在及版本，沒有驗證操作者身分。',
  '宣告輸入的前後 digest 檢查不是不可變 snapshot，也不能防止執行中修改後還原。',
  'runner 與結果未隔離或簽章；不提供自動接受、CI publisher 或完成清理權限。',
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
  if (!z.uuid().safeParse(runId).success) throw new GovError('INVALID_RUN_ID', 'run ID 必須是 UUID。')
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
  if (run.runId !== runId || run.taskId !== inspection.contract.taskId) throw new GovError('RUN_IDENTITY_MISMATCH', 'Run 資料的身分與指定路徑不一致。')
  return run
}

function assess(root: string, taskId: string, inspection: Inspection, run: Run | null): Report {
  const issues = [...inspection.blockers]
  const extra = { planDigest: inspection.planDigest, candidateDigest: inspection.candidateDigest, humanPending: inspection.humanPending }
  if (!run) return report('status', taskId, 'NOT_RUN', [...issues, { code: 'NOT_RUN', message: '尚無驗證紀錄。' }], 2, extra)
  if (run.planDigest !== inspection.planDigest || run.candidateDigest !== inspection.candidateDigest)
    return report('status', taskId, 'STALE', [...issues, { code: 'STALE', message: 'plan、宣告輸入、確認資料或執行環境已改變。' }], 2, { ...extra, run })
  if (run.phase !== 'FINISHED')
    return report('status', taskId, 'INCONCLUSIVE', [...issues, { code: 'INCOMPLETE_RUN', message: 'Run 尚未完整結束，不可從部分結果推論通過。' }], 2, { ...extra, run })
  const expected = inspection.contract.expectedChecks
  for (const id of duplicates(run.checks.map(item => item.checkId))) issues.push({ code: 'DUPLICATE_RESULT', message: `check 結果重複：${id}` })
  for (const result of run.checks) {
    if (!expected.some(check => check.id === result.checkId)) issues.push({ code: 'UNEXPECTED_RESULT', message: `未知 check：${result.checkId}` })
  }
  for (const check of expected) {
    const found = run.checks.find(result => result.checkId === check.id)
    if (!found) issues.push({ code: 'MISSING_RESULT', message: `缺少 ${check.id} 的結果。` })
    else if (check.required && found.verdict !== 'PASS') issues.push({ code: found.verdict, message: `${check.id}：${found.reason || found.verdict}` })
    else if (found.verdict === 'PASS' && (found.exitCode !== 0 || !found.observations.length || found.reason !== null))
      issues.push({ code: 'INVALID_RESULT', message: `${check.id} 的 PASS 紀錄不完整。` })
  }
  if (inspection.contract.review.required || run.reviewAttempts.length) {
    const attempt = run.reviewAttempts.at(-1)
    if (!attempt) issues.push({ code: 'REVIEW_NOT_RUN', message: '必要的外部 review 尚未匯入。' })
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
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new GovError('TASK_LOCKED', '此 Task 已有操作，或先前異常結束留下鎖。確認程序停止後才可手動移除 .lock。')
    throw error
  }
  try { return await work() }
  finally { closeSync(fd); unlinkSync(safePath(root, ref)) }
}

export async function verify(root: string, taskId: string, options: { runId?: string, reviewRef?: string, signal?: AbortSignal } = {}): Promise<Report> {
  const inspection = inspect(root, taskId)
  if (inspection.blockers.length) return { ...check(root, taskId), command: 'verify' }
  if (!inspection.runner || !inspection.candidateDigest) throw new GovError('INVALID_RUNNER', 'runner 或輸入摘要缺失。')
  return withLock(root, inspection, async () => {
    if (options.reviewRef) {
      if (!options.runId) throw new GovError('RUN_REQUIRED', '匯入 review 必須指定 --run，避免綁定錯誤的 Run。')
      const run = loadRun(root, inspection, options.runId)!
      if (run.phase !== 'FINISHED' || run.planDigest !== inspection.planDigest || run.candidateDigest !== inspection.candidateDigest)
        throw new GovError('REVIEW_TARGET_INVALID', '只能匯入完整且版本仍有效的 Run。')
      let payload: unknown = null
      let issues: Issue[]
      try {
        payload = readJson(root, options.reviewRef)
        issues = reviewIssues(root, inspection.contract, run, payload)
      }
      catch {
        issues = [{ code: 'INVALID_REVIEW', message: 'review JSON 無效、缺失或路徑不安全。' }]
      }
      run.reviewAttempts.push({ receivedAt: new Date().toISOString(), payload, issues })
      writeJson(root, runRef(inspection, run.runId), run)
      return { ...assess(root, taskId, inspect(root, taskId), run), command: 'verify' }
    }
    if (options.runId) throw new GovError('REVIEW_REQUIRED', '--run 僅用於匯入 --review；重跑檢查會建立新 Run。')
    const runs = readdirSync(safePath(root, inspection.runtimeRef)).filter(name => z.uuid().safeParse(name).success)
    if (runs.length >= inspection.contract.execution.maxAttempts!)
      throw new GovError('ATTEMPT_LIMIT', '此 Task 已達 maxAttempts；需明確修訂並重新確認計畫，不能自動略過上限。')
    const run: Run = {
      schemaVersion: 1, toolVersion: '0.1.0', assurance: 'Observe', taskId, runId: randomUUID(),
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
  const issues = [...current.issues, { code: 'EXTERNAL_FINALIZER_REQUIRED', message: '此版本只能預覽；尚無受信任完成入口與權限隔離，不會刪除任務資料。' }]
  const planned: string[] = []
  for (const [value, expected] of [
    [inspection.contract.cleanup.ownedChange, inspection.changeRef],
    [inspection.contract.cleanup.ownedRuntime, inspection.runtimeRef],
  ]) {
    if (value?.replace(/\/$/, '') !== expected) issues.push({ code: 'UNSAFE_CLEANUP_SCOPE', message: '清理範圍必須精確對應此 Task 的 change／runtime 目錄。' })
    else {
      safePath(root, expected!)
      planned.push(expected!)
    }
  }
  if (inspection.contract.completionTarget === 'CI') issues.push({ code: 'WAITING_FOR_CI', message: '需要 CI 新 Run 與外部明確完成流程。' })
  return report('complete', taskId, 'BLOCKED_EXTERNAL', issues, 2, {
    planDigest: inspection.planDigest,
    candidateDigest: inspection.candidateDigest,
    cleanupPreview: { deleteAfterExternalApproval: planned, preserve: inspection.contract.cleanup.preserve, executed: false },
  })
}
