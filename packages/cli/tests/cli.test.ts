import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { example, fixture, taskId } from './helpers'
import { discoveryStub } from './setup-helpers'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

it('ships the specwit executable and runs outside the workspace without node_modules', () => {
  const isolated = mkdtempSync(join(tmpdir(), 'specwit-bundle-'))
  const root = fixture()
  const blockedRoot = mkdtempSync(join(tmpdir(), 'specwit-blocked-'))
  cpSync(example, blockedRoot, { recursive: true })
  roots.push(isolated, root, blockedRoot)
  const binary = join(isolated, 'specwit.mjs')
  copyFileSync(new URL('../dist/specwit.mjs', import.meta.url), binary)
  const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  expect(metadata.bin).toEqual({ specwit: './dist/specwit.mjs' })
  const openspec = discoveryStub(isolated)
  const invoke = (...args: string[]) => spawnSync(process.execPath, [binary, ...args], { cwd: isolated, encoding: 'utf8', timeout: 10000, env: { ...process.env, OPENSPEC_BIN: openspec } })
  expect(invoke('--version').stdout.trim()).toBe(metadata.version)
  expect(invoke('--help').stdout).toContain('specwit verify')
  expect(invoke('--help').stdout).toContain('specwit init')
  const unbound = invoke('verify', taskId, '--root', root, '--json')
  expect(JSON.parse(unbound.stdout).issues[0].code).toBe('SPECWIT_NOT_INITIALIZED')
  expect(existsSync(join(root, '.governance/runtime'))).toBe(false)
  const initialized = invoke('init', root, '--json')
  expect(initialized.status, initialized.stdout).toBe(0)
  expect(JSON.parse(initialized.stdout)).toMatchObject({ language: 'en', state: 'INITIALIZED' })
  expect(invoke('init', '--root', blockedRoot, '--language', 'zh-TW', '--json').status).toBe(0)
  const blocked = invoke('validate', taskId, '--root', blockedRoot, '--json')
  expect(blocked.status).toBe(2)
  expect(JSON.parse(blocked.stdout).state).toBe('BLOCKED')
  expect(JSON.parse(blocked.stdout).command).toBe('validate')
  const alias = invoke('check', taskId, '--root', blockedRoot, '--json')
  expect(JSON.parse(alias.stdout).issues).toEqual(JSON.parse(blocked.stdout).issues)
  const result = invoke('verify', taskId, '--root', root, '--json')
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout)).toMatchObject({ state: 'PASS', eligible: false, assurance: 'Observe' })
  const invalid = invoke('verify', taskId, '--force', '--json')
  expect(invalid.status).toBe(3)
  expect(JSON.parse(invalid.stdout).issues[0].code).toBe('UNKNOWN_OPTION')
})
