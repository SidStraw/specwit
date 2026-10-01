import { spawnSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { isMap, parseDocument } from 'yaml'
import { z } from 'zod'
import { hasFile, readJson, readText, safePath } from './files'
import { digestSchema, SpecWitError, parse } from './model'
import { legacySchemaName } from './compat'

export const languageSchema = z.enum(['en', 'zh-TW'])
export type Language = z.infer<typeof languageSchema>
export const bindingRef = '.governance/config.json'
export const patchSchema = z.strictObject({
  context: z.string().min(1),
  operations: z.strictObject({ apply: z.array(z.string()), archive: z.array(z.string()) }),
})
export const projectSchema = z.strictObject({
  schemaVersion: z.literal(1),
  toolVersion: z.string().min(1),
  language: languageSchema,
  schema: z.enum(['specwit', legacySchemaName]),
  openspecVersion: z.string().min(1),
  previousSchema: z.string().min(1),
  configPatch: patchSchema,
  managedFiles: z.record(z.string(), digestSchema),
})
export type Project = z.infer<typeof projectSchema>

export function readOpenSpecConfig(root: string) {
  for (const ref of ['openspec', 'openspec/specs', 'openspec/changes']) {
    if (!hasFile(root, ref) || !lstatSync(safePath(root, ref)).isDirectory())
      throw new SpecWitError('OPENSPEC_NOT_INITIALIZED', `Run openspec init in this project first; missing directory: ${ref}`)
  }
  if (!hasFile(root, 'openspec/config.yaml'))
    throw new SpecWitError('OPENSPEC_NOT_INITIALIZED', 'Run openspec init in this project first; openspec/config.yaml is missing.')
  const document = parseDocument(readText(root, 'openspec/config.yaml'), { uniqueKeys: true })
  if (document.errors.length || document.warnings.length || !isMap(document.contents))
    throw new SpecWitError('INVALID_OPENSPEC_CONFIG', 'openspec/config.yaml must be an unambiguous YAML mapping without duplicate keys or unsupported tags.')
  const config = parse(z.object({
    schema: z.string().trim().min(1),
    context: z.string().optional(),
    rules: z.record(z.string(), z.array(z.string())).optional(),
    operations: z.record(z.string(), z.object({ guidance: z.array(z.string()).optional() }).passthrough()).optional(),
    store: z.unknown().optional(),
  }).passthrough(), document.toJS({ maxAliasCount: 100 }), 'openspec/config.yaml')
  if (config.store !== undefined && config.store !== null && config.store !== '')
    throw new SpecWitError('UNSUPPORTED_OPENSPEC_STORE', 'SpecWit currently binds local OpenSpec projects only; a store pointer must not redirect this project.')
  return { document, config }
}

export function readProject(root: string): Project | null {
  return hasFile(root, bindingRef) ? parse(projectSchema, readJson(root, bindingRef), bindingRef) : null
}

export function requireProject(root: string): Project {
  readOpenSpecConfig(root)
  const project = readProject(root)
  if (!project) throw new SpecWitError('SPECWIT_NOT_INITIALIZED', 'Run specwit init in this OpenSpec project before using SpecWit commands.')
  for (const ref of [`openspec/schemas/${project.schema}/schema.yaml`, '.governance/workflow.md']) {
    if (!hasFile(root, ref)) throw new SpecWitError('INCOMPLETE_SPECWIT_SETUP', `Missing ${ref}; rerun specwit init to restore missing managed files.`)
    readText(root, ref)
  }
  return project
}

// Call only OpenSpec's read-only discovery commands. Never initialize, install,
// update skills, or select a remote store on the user's behalf.
export function probeOpenSpec(root: string): string {
  let executable = process.env.OPENSPEC_BIN || 'openspec'
  let prefix: string[] = []
  if (!process.env.OPENSPEC_BIN) {
    try {
      const require = createRequire(join(root, 'package.json'))
      const metadataRef = require.resolve('@fission-ai/openspec/package.json')
      const metadata = JSON.parse(readFileSync(metadataRef, 'utf8'))
      const bin = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin?.openspec
      if (typeof bin === 'string') {
        executable = process.execPath
        prefix = [resolve(dirname(metadataRef), bin)]
      }
    }
    catch { /* A global OpenSpec on PATH is also supported. */ }
  }
  else if (/\.[cm]?js$/i.test(executable)) {
    prefix = [resolve(executable)]
    executable = process.execPath
  }
  function invoke(args: string[]): string {
    const result = spawnSync(executable, [...prefix, ...args], {
      cwd: root, shell: false, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024,
      env: { ...process.env, OPENSPEC_TELEMETRY: '0', OPENSPEC_NO_UPDATE_CHECK: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.error || result.status !== 0)
      throw new SpecWitError('OPENSPEC_UNAVAILABLE', 'OpenSpec discovery failed. Install OpenSpec, complete openspec init, and check openspec list --json in this project. OPENSPEC_BIN may point to an executable or its JS entry point.')
    return result.stdout.trim()
  }
  const version = invoke(['--version'])
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!parts || Number(parts[1]) !== 1 || Number(parts[2]) < 14)
    throw new SpecWitError('UNSUPPORTED_OPENSPEC_VERSION', `SpecWit requires OpenSpec >=1.14.0 <2.0.0 (tested with 1.14.0); found ${version}.`)
  let planningRoot: unknown
  try { planningRoot = JSON.parse(invoke(['list', '--json'])).root?.path }
  catch (error) {
    if (error instanceof SpecWitError) throw error
    throw new SpecWitError('INVALID_OPENSPEC_RESPONSE', 'OpenSpec did not return a valid project root.')
  }
  if (typeof planningRoot !== 'string' || realpathSync(planningRoot) !== realpathSync(root))
    throw new SpecWitError('OPENSPEC_ROOT_MISMATCH', 'OpenSpec resolved another planning root. SpecWit requires this exact local project; parent roots and external stores are not supported.')
  return version
}
