import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Contract, Run } from '../src/model'
import { inspect } from '../src/contract'
import { fileDigest } from '../src/files'

export const example = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/legacy-project')
export const taskId = 'daily-check-in'

export function put(root: string, path: string, value: unknown): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
}

export function contract(root: string): Contract {
  return JSON.parse(readFileSync(join(root, `openspec/changes/${taskId}/verification-contract.json`), 'utf8'))
}

export function saveContract(root: string, value: Contract): void {
  put(root, `openspec/changes/${taskId}/verification-contract.json`, value)
}

// A synthetic approval for disposable tests only, never a real user's approval.
export function confirmFixture(root: string): void {
  const current = contract(root)
  current.planDigest = inspect(root, taskId).planDigest
  current.confirmation = { status: 'CONFIRMED', sourceRef: '.governance/test-confirmation.json', confirmedPlanDigest: current.planDigest }
  saveContract(root, current)
}

export const successfulRunner = `
import { readFileSync } from 'node:fs'
const value = readFileSync('test-files/subject.txt', 'utf8').trim()
console.log(JSON.stringify({schemaVersion:1,checkId:process.env.SPECWIT_CHECK_ID,verdict:value === 'correct' ? 'PASS' : 'FAIL',observations:['subject=' + value]}))
`

export function fixture(runner = successfulRunner): string {
  const root = mkdtempSync(join(tmpdir(), 'specwit-cli-test-'))
  for (const name of ['openspec', 'fixtures', 'contracts']) cpSync(join(example, name), join(root, name), { recursive: true })
  put(root, 'test-files/subject.txt', 'correct')
  put(root, 'test-files/runner.mjs', runner)
  put(root, '.governance/test-confirmation.json', { synthetic: true })
  const current = contract(root)
  for (const key of ['policy', 'binding', 'verifier'] as const) {
    const ref = `.governance/${key}.json`
    put(root, ref, { synthetic: true, kind: key })
    const resource = { ref, digest: fileDigest(root, ref) }
    if (key === 'policy') current.policy = resource
    else current[key] = { ...resource, status: 'READY' }
  }
  current.expectedChecks = [{ id: 'B01', requirementIds: ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'], required: true, mode: 'PROGRAMMATIC', readiness: 'READY' }]
  current.review.required = false
  current.humanItems = []
  current.execution = { candidate: null, runId: null, maxAttempts: 10, timeoutSeconds: 1 }
  put(root, '.governance/runner.json', { schemaVersion: 1, inputs: ['test-files'], checks: [{ id: 'B01', command: ['$NODE', 'test-files/runner.mjs'] }] })
  saveContract(root, current)
  confirmFixture(root)
  return root
}

export function reviewFor(run: Run) {
  return {
    schemaVersion: 1,
    taskId: run.taskId,
    runId: run.runId,
    planDigest: run.planDigest,
    candidateDigest: run.candidateDigest,
    response: {
      schemaVersion: 1,
      assessments: ['requirement-coverage', 'implementation-risk'].map(criterionId => ({
        criterionId, verdict: 'meets', confidence: 0.7,
        rationale: 'Synthetic reviewer fixture.', evidenceIds: ['check:B01'], limitations: ['Synthetic test only'],
      })),
    },
  }
}
