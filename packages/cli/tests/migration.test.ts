import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialize } from '../src/init'
import { readProject, requireProject } from '../src/project'
import { inspect } from '../src/contract'
import { status, verify } from '../src/core'
import { legacySchemaName } from '../src/compat'
import { fixture, put, taskId } from './helpers'
import { discoveryStub } from './setup-helpers'

const roots: string[] = []
const frozen = JSON.parse(readFileSync(new URL('./fixtures/legacy-gov-init.json', import.meta.url), 'utf8')) as { files: Record<string, string> }
const legacyRunner = `
import { readFileSync } from 'node:fs'
const value = readFileSync('test-files/subject.txt', 'utf8').trim()
const aligned = process.env.GOV_TASK_ID === process.env.SPECWIT_TASK_ID
  && process.env.GOV_RUN_ID === process.env.SPECWIT_RUN_ID
  && process.env.GOV_CHECK_ID === process.env.SPECWIT_CHECK_ID
console.log(JSON.stringify({schemaVersion:1,checkId:process.env.GOV_CHECK_ID,verdict:value === 'correct' && aligned ? 'PASS' : 'FAIL',observations:['subject=' + value, 'environment aliases match=' + aligned]}))
`

function legacyProject(): string {
  const root = fixture(legacyRunner)
  roots.push(root)
  for (const [ref, content] of Object.entries(frozen.files)) put(root, ref, content)
  put(root, `openspec/changes/${taskId}/.openspec.yaml`, `schema: ${legacySchemaName}\n`)
  vi.stubEnv('OPENSPEC_BIN', discoveryStub(root))
  return root
}

function snapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {}
  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else result[relative(root, path)] = readFileSync(path, 'utf8')
    }
  }
  walk(root)
  return result
}

afterEach(() => {
  vi.unstubAllEnvs()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('migration from the frozen 0.2.0 installation', () => {
  it('reads legacy binding and Run records, migrates prompts, and preserves existing evidence and change data', async () => {
    const root = legacyProject()
    expect(requireProject(root).schema).toBe(legacySchemaName)
    const verified = await verify(root, taskId)
    expect(verified.state).toBe('PASS')
    expect(verified.run?.checks[0].observations).toContain('environment aliases match=true')
    const runRef = `.governance/runtime/${taskId}/${verified.run!.runId}/run.json`
    // Historical record parsing: the synthetic data deliberately uses the old tool version.
    put(root, runRef, { ...verified.run, toolVersion: '0.2.0' })
    const before = snapshot(root)
    const beforeInspection = inspect(root, taskId)
    const installed = initialize(root)
    expect(installed).toMatchObject({ language: 'en', schema: 'specwit', state: 'INITIALIZED' })
    expect(requireProject(root).schema).toBe('specwit')
    expect(readProject(root)?.previousSchema).toBe('spec-driven')
    for (const [ref, content] of Object.entries(before)) {
      if (ref.startsWith('openspec/changes/') || ref.startsWith('.governance/runtime/') || ref.startsWith('test-files/'))
        expect(readFileSync(join(root, ref), 'utf8'), ref).toBe(content)
    }
    const alias = readFileSync(join(root, `openspec/schemas/${legacySchemaName}/schema.yaml`), 'utf8')
    expect(alias).toContain(`name: ${legacySchemaName}`)
    expect(alias).toContain('specwit validate')
    const current = inspect(root, taskId)
    expect(current.planDigest).toBe(beforeInspection.planDigest)
    expect(current.candidateDigest).toBe(beforeInspection.candidateDigest)
    expect(status(root, taskId)).toMatchObject({ state: 'PASS', assurance: 'Observe', eligible: false, run: { toolVersion: '0.2.0' } })
    expect(initialize(root).state).toBe('UNCHANGED')
    expect(initialize(root, 'zh-TW').language).toBe('zh-TW')
    expect(readFileSync(join(root, `openspec/schemas/${legacySchemaName}/templates/tasks.md`), 'utf8')).toContain('specwit')
    expect(status(root, taskId).state).toBe('PASS')
    put(root, 'test-files/subject.txt', 'defect')
    expect(status(root, taskId).state).toBe('STALE')
    expect((await verify(root, taskId)).state).toBe('FAIL')
  })

  it.each([
    '.governance/workflow.md',
    `openspec/schemas/${legacySchemaName}/templates/tasks.md`,
    'openspec/schemas/specwit/schema.yaml',
  ])('refuses to overwrite edited or conflicting resources without partially migrating: %s', (ref) => {
    const root = legacyProject()
    put(root, ref, 'Project-specific content; preserve it.')
    const before = snapshot(root)
    expect(() => initialize(root)).toThrow('local edits')
    expect(snapshot(root)).toEqual(before)
  })

  it('rejects mixed unowned context markers and preserves the existing configuration', () => {
    const root = legacyProject()
    const ref = 'openspec/config.yaml'
    const original = readFileSync(join(root, ref), 'utf8')
    put(root, ref, original.replace('context: |', 'context: |\n  <!-- specwit:context:start -->'))
    const before = snapshot(root)
    expect(() => initialize(root)).toThrow('context block')
    expect(snapshot(root)).toEqual(before)
  })
})
