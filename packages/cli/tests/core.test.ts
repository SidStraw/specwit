import { existsSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { check, complete, status, verify } from '../src/core'
import { inspect } from '../src/contract'
import { argumentsFor } from '../src/args'
import { confirmFixture, contract, example, fixture, put, reviewFor, saveContract, taskId } from './helpers'

const roots: string[] = []
function project(runner?: string): string {
  const root = fixture(runner)
  roots.push(root)
  return root
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

describe('contract and path boundaries', () => {
  it('reports actual example blockers without running or writing anything', async () => {
    const report = await verify(example, taskId)
    expect(report.state).toBe('BLOCKED')
    expect(report.issues.map(item => item.code)).toContain('CONFIRMATION_PENDING')
    expect(report.issues.map(item => item.code)).not.toContain('INVALID_REVIEW_SCHEMA')
    expect(existsSync(join(example, '.governance/runtime'))).toBe(false)
  })

  it('rejects malformed JSON and duplicate or uncovered IDs', () => {
    const root = project()
    const current = contract(root)
    current.expectedChecks.push({ ...current.expectedChecks[0], requirementIds: ['R01'] })
    current.expectedChecks[0].requirementIds = ['R01', 'nonexistent']
    saveContract(root, current)
    const codes = check(root, taskId).issues.map(item => item.code)
    expect(codes).toContain('DUPLICATE_ID')
    expect(codes).toContain('UNCOVERED_REQUIREMENT')
    expect(codes).toContain('UNKNOWN_REQUIREMENT')
    put(root, `openspec/changes/${taskId}/verification-contract.json`, '{ invalid')
    expect(() => check(root, taskId)).toThrow('Cannot parse JSON')
  })

  it('rejects traversal, symlink references and symlink runtime writes', async () => {
    const root = project()
    expect(() => check(root, '../elsewhere')).toThrow('kebab-case')
    const current = contract(root)
    current.sources[0].ref = '../outside'
    saveContract(root, current)
    expect(check(root, taskId).issues.map(item => item.code)).toContain('MISSING_OR_UNSAFE_FILE')
    const clean = project()
    symlinkSync(join(clean, 'test-files/subject.txt'), join(clean, 'test-files/link'))
    expect(check(clean, taskId).issues.map(item => item.code)).toContain('INVALID_RUNNER_CONFIG')
    const runtime = project()
    symlinkSync(join(runtime, 'test-files'), join(runtime, '.governance/runtime'))
    await expect(verify(runtime, taskId)).rejects.toThrow('Symlink')
  })

  it('exposes a stable plan digest and invalidates changed plan confirmation', () => {
    const root = project()
    expect(check(root, taskId).state).toBe('READY')
    const prior = inspect(root, taskId).planDigest
    put(root, `openspec/changes/${taskId}/behavior-plan.md`, '# A changed plan\n')
    expect(inspect(root, taskId).planDigest).not.toBe(prior)
    expect(check(root, taskId).issues.map(item => item.code)).toContain('CONFIRMATION_STALE')
  })

  it('supports a per-change runner without requiring a shared project runner', async () => {
    const root = project()
    const current = contract(root)
    const runnerRef = `openspec/changes/${taskId}/runner.json`
    put(root, runnerRef, { schemaVersion: 1, inputs: ['test-files'], checks: [{ id: 'B01', command: ['$NODE', 'test-files/runner.mjs'] }] })
    current.execution.runnerRef = runnerRef
    saveContract(root, current)
    rmSync(join(root, '.governance/runner.json'))
    confirmFixture(root)
    expect((await verify(root, taskId)).state).toBe('PASS')
    put(root, 'openspec/changes/another-task/runner.json', { checks: [] })
    expect(status(root, taskId).state).toBe('PASS')
    put(root, runnerRef, { invalid: true })
    expect(check(root, taskId).issues.map(item => item.code)).toContain('INVALID_RUNNER_CONFIG')
  })
})

describe('real subprocess verification', () => {
  it('runs a check and preserves Observe-only status', async () => {
    const root = project()
    const result = await verify(root, taskId)
    expect(result.state).toBe('PASS')
    expect(result.eligible).toBe(false)
    expect(result.run?.checks[0].observations).toEqual(['subject=correct'])
    expect(status(root, taskId).state).toBe('PASS')
    expect(existsSync(join(root, `.governance/runtime/${taskId}/.lock`))).toBe(false)
  })

  it('distinguishes product failure from malformed or conflicting output', async () => {
    const root = project()
    put(root, 'test-files/subject.txt', 'defect')
    expect((await verify(root, taskId)).state).toBe('FAIL')
    const noReport = project("console.log('PASS')")
    expect((await verify(noReport, taskId)).run?.checks[0].reason).toBe('INVALID_REPORT')
    const conflict = project("console.log(JSON.stringify({schemaVersion:1,checkId:'B01',verdict:'PASS',observations:['claimed pass']}));process.exitCode=1")
    expect((await verify(conflict, taskId)).run?.checks[0].reason).toBe('EXIT_REPORT_CONFLICT')
  })

  it('times out, caps output and handles unavailable executables', async () => {
    const hanging = project('setInterval(() => {}, 100)')
    expect((await verify(hanging, taskId)).run?.checks[0].reason).toBe('TIMEOUT')
    const noisy = project("console.log('x'.repeat(300000))")
    expect((await verify(noisy, taskId)).run?.checks[0].reason).toBe('OUTPUT_LIMIT')
    const missing = project()
    put(missing, '.governance/runner.json', { schemaVersion: 1, inputs: ['test-files'], checks: [{ id: 'B01', command: ['specwit-nonexistent-test-binary'] }] })
    confirmFixture(missing)
    expect((await verify(missing, taskId)).run?.checks[0].reason).toBe('SPAWN_ERROR')
  })

  it('detects changes after and during execution, including new input files', async () => {
    const root = project()
    await verify(root, taskId)
    put(root, 'test-files/new.txt', 'new input')
    expect(status(root, taskId).state).toBe('STALE')
    const mutating = project("import{writeFileSync}from'node:fs';writeFileSync('test-files/subject.txt','changed');console.log(JSON.stringify({schemaVersion:1,checkId:'B01',verdict:'PASS',observations:['claimed pass']}))")
    expect((await verify(mutating, taskId)).state).toBe('STALE')
  })

  it('blocks missing, duplicate and corrupted stored reports', async () => {
    const root = project()
    const result = await verify(root, taskId)
    const run = result.run!
    const path = `.governance/runtime/${taskId}/${run.runId}/run.json`
    put(root, path, { ...run, checks: [] })
    expect(status(root, taskId).issues.map(item => item.code)).toContain('MISSING_RESULT')
    put(root, path, { ...run, checks: [run.checks[0], run.checks[0]] })
    expect(status(root, taskId).issues.map(item => item.code)).toContain('DUPLICATE_RESULT')
    put(root, path, { ...run, phase: 'RUNNING' })
    expect(status(root, taskId).state).toBe('INCONCLUSIVE')
    put(root, path, { ...run, checks: [{ ...run.checks[0], observations: [] }] })
    expect(status(root, taskId).issues.map(item => item.code)).toContain('INVALID_RESULT')
  })

  it('enforces attempt limits, task locks and cancellation', async () => {
    const root = project()
    const current = contract(root)
    current.execution.maxAttempts = 1
    saveContract(root, current)
    confirmFixture(root)
    await verify(root, taskId)
    await expect(verify(root, taskId)).rejects.toThrow('maxAttempts')
    const locked = project()
    put(locked, `.governance/runtime/${taskId}/.lock`, 'existing')
    await expect(verify(locked, taskId)).rejects.toThrow('locked')
    const cancelled = project('setInterval(() => {}, 100)')
    const controller = new AbortController()
    const pending = verify(cancelled, taskId, { signal: controller.signal })
    controller.abort()
    const result = await pending
    expect(result.state).toBe('INCONCLUSIVE')
    expect(result.run?.phase).toBe('INTERRUPTED')
    expect(result.run?.checks[0].reason).toBe('CANCELLED')
  })
})

describe('external review and explicit completion', () => {
  it('binds review identity, validates schema and exact criterion/evidence coverage', async () => {
    const root = project()
    const current = contract(root)
    current.review.required = true
    saveContract(root, current)
    confirmFixture(root)
    const first = await verify(root, taskId)
    expect(first.issues.map(item => item.code)).toContain('REVIEW_NOT_RUN')
    const run = first.run!
    const wrong = reviewFor(run)
    wrong.candidateDigest = '0'.repeat(64)
    wrong.response.assessments[0].evidenceIds = ['fake']
    wrong.response.assessments.pop()
    put(root, 'review.json', wrong)
    const rejected = await verify(root, taskId, { runId: run.runId, reviewRef: 'review.json' })
    expect(rejected.issues.map(item => item.code)).toEqual(expect.arrayContaining(['REVIEW_IDENTITY_MISMATCH', 'UNKNOWN_EVIDENCE', 'MISSING_CRITERION']))
    put(root, 'review.json', reviewFor(run))
    const accepted = await verify(root, taskId, { runId: run.runId, reviewRef: 'review.json' })
    expect(accepted.state).toBe('PASS')
    expect(accepted.run?.reviewAttempts).toHaveLength(2)
    expect(accepted.eligible).toBe(false)
    put(root, 'review.json', '{ invalid')
    const invalid = await verify(root, taskId, { runId: run.runId, reviewRef: 'review.json' })
    expect(invalid.state).toBe('BLOCKED')
    expect(invalid.run?.reviewAttempts).toHaveLength(3)
    put(root, 'test-files/subject.txt', 'edited')
    await expect(verify(root, taskId, { runId: run.runId, reviewRef: 'review.json' })).rejects.toThrow('version is still current')
  })

  it('does not convert unknown or duplicate review assessments into a pass', async () => {
    const root = project()
    const first = await verify(root, taskId)
    const run = first.run!
    const review = reviewFor(run)
    review.response.assessments.push(review.response.assessments[0])
    put(root, 'review.json', review)
    expect((await verify(root, taskId, { runId: run.runId, reviewRef: 'review.json' })).issues.map(item => item.code)).toContain('DUPLICATE_CRITERION')
    const unknown = reviewFor(run)
    put(root, 'review.json', { ...unknown, response: { ...unknown.response, assessments: unknown.response.assessments.map(item => ({ ...item, verdict: 'unknown', confidence: null })) } })
    expect((await verify(root, taskId, { runId: run.runId, reviewRef: 'review.json' })).issues.map(item => item.code)).toContain('REVIEW_UNRESOLVED')
  })

  it('blocks completion and unsafe cleanup even after Observe PASS', async () => {
    const root = project()
    await verify(root, taskId)
    const preview = complete(root, taskId)
    expect(preview.state).toBe('BLOCKED_EXTERNAL')
    expect(preview.cleanupPreview?.executed).toBe(false)
    expect(existsSync(join(root, `openspec/changes/${taskId}/tasks.md`))).toBe(true)
    const current = contract(root)
    current.cleanup.ownedChange = '../another-project'
    current.completionTarget = 'CI'
    saveContract(root, current)
    const blocked = complete(root, taskId)
    expect(blocked.issues.map(item => item.code)).toEqual(expect.arrayContaining(['UNSAFE_CLEANUP_SCOPE', 'WAITING_FOR_CI']))
  })
})

describe('argument parsing', () => {
  it('keeps task IDs as strings and rejects typo/duplicate/extra flags', () => {
    expect(argumentsFor(['check', '123', '--root', 'a b', '--json']).taskId).toBe('123')
    expect(() => argumentsFor(['check', taskId, '--force'])).toThrow('Unknown option')
    expect(() => argumentsFor(['verify', taskId, '--root'])).toThrow('requires a value')
    expect(() => argumentsFor(['check', taskId, '--root', 'a', '--root', 'b'])).toThrow('Duplicate option')
    expect(() => argumentsFor(['verify', taskId, '--review', 'review.json'])).toThrow('both --review and --run')
    expect(() => argumentsFor(['complete', taskId, '--execute'])).toThrow('Unknown option')
    expect(() => argumentsFor(['check', taskId, 'extra'])).toThrow('Usage')
  })
})
