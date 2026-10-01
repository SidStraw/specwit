import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, it } from 'vitest'
import { discoveryStub, openSpecProject } from './setup-helpers'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

it('installs the npm tarball offline and initializes from its executable outside the checkout', () => {
  const temp = mkdtempSync(join(tmpdir(), 'specwit-npm-install-'))
  const root = openSpecProject()
  roots.push(temp, root)
  const packageRoot = fileURLToPath(new URL('../', import.meta.url))
  const npmCli = process.env.npm_execpath
  // npm's Node entry point also avoids shell-quoting project paths on Windows.
  const npm = npmCli?.includes('npm-cli') ? npmCli : join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')
  const env = { ...process.env, npm_config_cache: join(temp, 'cache'), npm_config_update_notifier: 'false' }
  const pack = spawnSync(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', temp], {
    cwd: packageRoot, env, encoding: 'utf8', timeout: 20000,
  })
  expect(pack.status, pack.stderr).toBe(0)
  const packed = JSON.parse(pack.stdout)[0]
  expect(packed.name).toBe('@sidtw/specwit')
  expect(packed.filename).toBe(`sidtw-specwit-${packed.version}.tgz`)
  const files = packed.files.map((file: { path: string }) => file.path)
  expect(files).toEqual(expect.arrayContaining(['dist/specwit.mjs', 'dist/THIRD_PARTY_NOTICES.txt', 'README.md', 'README.zh-TW.md', 'MIGRATION.md', 'MIGRATION.zh-TW.md', 'LICENSE', 'NOTICE']))
  expect(files.some((ref: string) => /^(tests|example|node_modules)\//.test(ref))).toBe(false)
  const install = spawnSync(process.execPath, [npm, 'install', '--global', '--prefix', join(temp, 'install'), '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(temp, packed.filename)], {
    cwd: root, env, encoding: 'utf8', timeout: 20000,
  })
  expect(install.status, install.stderr).toBe(0)
  const sourceMetadata = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  const installed = join(temp, 'install', process.platform === 'win32' ? '' : 'lib', 'node_modules', sourceMetadata.name)
  const metadata = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
  expect(metadata.bin).toEqual({ specwit: './dist/specwit.mjs' })
  expect(metadata.private).not.toBe(true)
  expect(JSON.stringify(metadata)).not.toContain('catalog:')
  const binary = join(installed, metadata.bin.specwit)
  // On POSIX exercise npm's actual executable shim, including its shebang.
  const executable = process.platform === 'win32' ? process.execPath : join(temp, 'install/bin/specwit')
  const prefix = process.platform === 'win32' ? [binary] : []
  const command = spawnSync(executable, [...prefix, '--version'], { cwd: root, env, encoding: 'utf8', timeout: 10000 })
  expect(command.status, command.stderr).toBe(0)
  expect(command.stdout.trim()).toBe(sourceMetadata.version)
  const result = spawnSync(executable, [...prefix, 'init', '--json'], {
    cwd: root, env: { ...env, OPENSPEC_BIN: discoveryStub(root) }, encoding: 'utf8', timeout: 10000,
  })
  expect(result.status, result.stdout).toBe(0)
  expect(JSON.parse(result.stdout)).toMatchObject({ language: 'en', schema: 'specwit' })
  expect(existsSync(join(root, 'openspec/schemas/specwit/templates/behavior-plan.md'))).toBe(true)
  expect(readFileSync(join(root, '.governance/prompts/review.md'), 'utf8')).toContain('Independent SpecWit review')
}, 60000)
