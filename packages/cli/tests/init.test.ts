import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialize } from '../src/init'
import { readProject, requireProject } from '../src/project'
import { put } from './helpers'
import { discoveryStub, openSpecProject } from './setup-helpers'

const roots: string[] = []
function project(): string {
  const root = openSpecProject()
  roots.push(root)
  vi.stubEnv('OPENSPEC_BIN', discoveryStub(root))
  return root
}
function snapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {}
  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = join(directory, entry.name)
      if (entry.isDirectory()) walk(target)
      else if (entry.isFile()) files[relative(root, target)] = readFileSync(target, 'utf8')
    }
  }
  walk(root)
  return files
}
afterEach(() => {
  vi.unstubAllEnvs()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('OpenSpec binding', () => {
  it('requires completed initialization before writing any SpecWit files', () => {
    const root = mkdtempSync(join(tmpdir(), 'specwit-uninitialized-'))
    roots.push(root)
    expect(() => initialize(root)).toThrow('openspec init')
    expect(readdirSync(root)).toEqual([])
    mkdirSync(join(root, 'openspec'))
    expect(() => initialize(root)).toThrow('openspec init')
    expect(readdirSync(root)).toEqual(['openspec'])
  })

  it.each([
    'schema: [invalid]\n',
    'schema: spec-driven\nschema: duplicate\n',
    'schema: spec-driven\ncontext: [invalid]\n',
    'schema: spec-driven\noperations:\n  apply:\n    guidance: invalid\n',
    'schema: spec-driven\nstore: elsewhere\n',
  ])('rejects malformed or redirected OpenSpec config without writes: %s', (config) => {
    const root = project()
    put(root, 'openspec/config.yaml', config)
    const before = snapshot(root)
    expect(() => initialize(root)).toThrow()
    expect(snapshot(root)).toEqual(before)
    expect(existsSync(join(root, '.governance'))).toBe(false)
  })

  it('checks the actual OpenSpec version and resolved planning root', () => {
    const root = project()
    discoveryStub(root, '1.13.0')
    expect(() => initialize(root)).toThrow('requires OpenSpec')
    const other = openSpecProject()
    roots.push(other)
    discoveryStub(root, '1.14.0', other)
    expect(() => initialize(root)).toThrow('another planning root')
    vi.stubEnv('OPENSPEC_BIN', join(root, 'missing-openspec'))
    expect(() => initialize(root)).toThrow('discovery failed')
    expect(existsSync(join(root, '.governance'))).toBe(false)
  })
})

describe('portable workflow installation', () => {
  it('defaults to English and preserves existing config, skills, changes, and ignore rules', () => {
    const root = project()
    put(root, '.opencode/skills/custom/SKILL.md', 'existing agent instructions')
    put(root, 'openspec/changes/old/.openspec.yaml', 'schema: spec-driven\n')
    put(root, 'openspec/changes/old/proposal.md', '# Existing proposal\n')
    put(root, '.gitignore', 'node_modules/\n')
    const result = initialize(root)
    expect(result).toMatchObject({ state: 'INITIALIZED', language: 'en', schema: 'specwit', exitCode: 0 })
    const output = snapshot(root)
    const config = parseYaml(output['openspec/config.yaml'])
    expect(config.schema).toBe('specwit')
    expect(config.context).toContain('Preserve the existing product policy.')
    expect(config.context).toContain('Use English')
    expect(config.rules.tasks).toEqual(['Keep task-specific checks.'])
    expect(config.operations.apply.guidance).toContain('Run the existing project linter.')
    expect(config.references).toEqual([])
    expect(output['openspec/config.yaml']).toContain('# Keep the project comment')
    expect(output['.opencode/skills/custom/SKILL.md']).toBe('existing agent instructions')
    expect(output['openspec/changes/old/.openspec.yaml']).toBe('schema: spec-driven\n')
    expect(output['openspec/changes/old/proposal.md']).toBe('# Existing proposal\n')
    expect(output['.gitignore']).toBe('node_modules/\n.governance/runtime/\n')
    expect(output['.governance/prompts/review.md']).toContain('Independent SpecWit review')
    expect(output['.governance/contracts/verification-contract.schema.json']).toContain('runnerRef')
    expect(output['.governance/runner.json']).toBeUndefined()
    expect(readProject(root)?.previousSchema).toBe('team-flow')
    expect(requireProject(root).language).toBe('en')
    for (const ref of Object.keys(readProject(root)!.managedFiles)) {
      expect(output[ref]).not.toMatch(/\/(?:Users|home)\/[^/]+\/|daily-check-in|\.\.\/docs\/|dist\/specwit\.mjs/)
      expect(output[ref]).not.toMatch(/\p{Script=Han}/u)
    }
  })

  it('is idempotent and changes the installed language without rewriting active artifacts', () => {
    const root = project()
    initialize(root)
    const before = snapshot(root)
    expect(initialize(root)).toMatchObject({ state: 'UNCHANGED', filesWritten: [] })
    expect(snapshot(root)).toEqual(before)
    put(root, 'openspec/changes/active/proposal.md', '# Keep the original language\n')
    const config = readFileSync(join(root, 'openspec/config.yaml'), 'utf8')
    put(root, 'openspec/config.yaml', config.replace('Preserve the existing product policy.', 'User amended the product policy.'))
    const changed = initialize(root, 'zh-TW')
    expect(changed.language).toBe('zh-TW')
    const translated = snapshot(root)
    expect(translated['.governance/workflow.md']).toContain('SpecWit 擴充')
    expect(translated['.governance/prompts/review.md']).toContain('獨立評估')
    expect(translated['openspec/config.yaml']).toContain('User amended the product policy.')
    expect(translated['openspec/config.yaml']).not.toContain('Use English')
    expect(translated['openspec/changes/active/proposal.md']).toBe('# Keep the original language\n')
    expect(initialize(root)).toMatchObject({ state: 'UNCHANGED', language: 'zh-TW' })
    const parsed = parseYaml(translated['openspec/config.yaml'])
    expect(parsed.operations.apply.guidance).toHaveLength(4)
    expect(parsed.operations.apply.guidance).toContain('Run the existing project linter.')
    expect(initialize(root, 'en').language).toBe('en')
  })

  it('refuses to overwrite unrelated files or local edits, with no partial language switch', () => {
    const root = project()
    put(root, 'openspec/schemas/specwit/templates/tasks.md', 'User-owned template')
    const before = snapshot(root)
    expect(() => initialize(root)).toThrow('local edits')
    expect(snapshot(root)).toEqual(before)
    rmSync(join(root, 'openspec/schemas/specwit'), { recursive: true })
    initialize(root)
    put(root, '.governance/prompts/review.md', 'Customized reviewer rubric')
    const edited = snapshot(root)
    expect(() => initialize(root, 'zh-TW')).toThrow('local edits')
    expect(snapshot(root)).toEqual(edited)
  })

  it('preserves changed managed context instead of replacing it', () => {
    const root = project()
    initialize(root)
    const config = readFileSync(join(root, 'openspec/config.yaml'), 'utf8')
    put(root, 'openspec/config.yaml', config.replace('Use English', 'Use a custom language'))
    const before = snapshot(root)
    expect(() => initialize(root, 'zh-TW')).toThrow('context block was edited')
    expect(snapshot(root)).toEqual(before)
  })

  it('refuses a language switch when managed operation guidance was edited', () => {
    const root = project()
    initialize(root)
    const config = readFileSync(join(root, 'openspec/config.yaml'), 'utf8')
    put(root, 'openspec/config.yaml', config.replace('SpecWit: Read', 'SpecWit: Custom instruction replacing'))
    const before = snapshot(root)
    expect(() => initialize(root, 'zh-TW')).toThrow('guidance was edited')
    expect(snapshot(root)).toEqual(before)
  })

  it('rejects symlink destinations and restores missing managed files safely', () => {
    const root = project()
    const outside = openSpecProject()
    roots.push(outside)
    symlinkSync(outside, join(root, '.governance'))
    expect(() => initialize(root)).toThrow('Symlink')
    expect(existsSync(join(outside, 'config.json'))).toBe(false)
    rmSync(join(root, '.governance'))
    initialize(root)
    rmSync(join(root, '.governance/workflow.md'))
    expect(() => requireProject(root)).toThrow('Missing')
    expect(initialize(root).filesWritten).toContain('.governance/workflow.md')
  })
})
