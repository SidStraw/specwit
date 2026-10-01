import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { example, fixture, taskId } from './helpers'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

it('ships the gov executable and runs outside the workspace without node_modules', () => {
  const isolated = mkdtempSync(join(tmpdir(), 'gov-bundle-'))
  const root = fixture()
  roots.push(isolated, root)
  const binary = join(isolated, 'gov.mjs')
  copyFileSync(new URL('../dist/gov.mjs', import.meta.url), binary)
  const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  expect(metadata.bin).toEqual({ gov: './dist/gov.mjs' })
  const invoke = (...args: string[]) => spawnSync(process.execPath, [binary, ...args], { cwd: isolated, encoding: 'utf8', timeout: 10000 })
  expect(invoke('--version').stdout.trim()).toBe('0.1.0')
  expect(invoke('--help').stdout).toContain('gov verify')
  const blocked = invoke('check', taskId, '--root', example, '--json')
  expect(blocked.status).toBe(2)
  expect(JSON.parse(blocked.stdout).state).toBe('BLOCKED')
  const result = invoke('verify', taskId, '--root', root, '--json')
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout)).toMatchObject({ state: 'PASS', eligible: false, assurance: 'Observe' })
  const invalid = invoke('verify', taskId, '--force', '--json')
  expect(invalid.status).toBe(3)
  expect(JSON.parse(invalid.stdout).issues[0].code).toBe('UNKNOWN_OPTION')
})
