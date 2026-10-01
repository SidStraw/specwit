import { randomUUID } from 'node:crypto'
import { closeSync, lstatSync, mkdirSync, openSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { isMap, isSeq } from 'yaml'
import { z } from 'zod'
import { commonResources, localizedResources } from '../generated/resources'
import { hasFile, readText, safePath, sha256 } from './files'
import { checkOutputSchema, contractSchema, SpecWitError, parse, reviewEnvelopeSchema, runnerSchema } from './model'
import { bindingRef, languageSchema, patchSchema, probeOpenSpec, readOpenSpecConfig, readProject } from './project'
import type { Language, Project } from './project'
import { VERSION } from './version'
import { legacySchemaName } from './compat'

export interface InitReport {
  schemaVersion: 1
  command: 'init'
  state: 'INITIALIZED' | 'UNCHANGED'
  root: string
  language: Language
  schema: 'specwit'
  openspecVersion: string
  filesWritten: string[]
  notes: string[]
  exitCode: 0
}

function optionalText(root: string, ref: string): string | null {
  return hasFile(root, ref) ? readText(root, ref) : null
}

function contextBlock(context: string, name = 'specwit'): string {
  return `<!-- ${name}:context:start -->\n${context}\n<!-- ${name}:context:end -->`
}

export function initialize(root: string, language?: Language): InitReport {
  const { document, config } = readOpenSpecConfig(root)
  const previous = readProject(root)
  const selected = parse(languageSchema, language ?? previous?.language ?? 'en', 'language')
  const openspecVersion = probeOpenSpec(root)
  const resources = localizedResources[selected]
  const patch = parse(patchSchema, JSON.parse(resources['config-fragment.json']), 'bundled config fragment')
  const desired = { ...commonResources, ...resources }
  delete desired['config-fragment.json']
  // Retain the registered legacy schema name for existing changes. Refresh its
  // CLI instructions only when its files are still owned and unmodified.
  // Keep tracking the alias after migration so later language changes update it.
  const legacyPrefix = `openspec/schemas/${legacySchemaName}/`
  if (previous && Object.keys(previous.managedFiles).some(ref => ref.startsWith(legacyPrefix))) {
    for (const [ref, content] of Object.entries(desired)) {
      const currentPrefix = 'openspec/schemas/specwit/'
      if (ref.startsWith(currentPrefix)) {
        const aliasRef = legacyPrefix + ref.slice(currentPrefix.length)
        desired[aliasRef] = ref.endsWith('/schema.yaml') ? content.replace(/^name: specwit$/m, `name: ${legacySchemaName}`) : content
      }
    }
  }
  for (const [name, schema] of Object.entries({
    'verification-contract': contractSchema, runner: runnerSchema,
    'check-output': checkOutputSchema, 'review-envelope': reviewEnvelopeSchema,
  })) desired[`.governance/contracts/${name}.schema.json`] = `${JSON.stringify(z.toJSONSchema(schema, { target: 'draft-2020-12' }), null, 2)}\n`

  const conflicts: string[] = []
  for (const [ref, text] of Object.entries(desired)) {
    const current = optionalText(root, ref)
    if (current !== null && current !== text && previous?.managedFiles[ref] !== sha256(current)) conflicts.push(ref)
  }
  if (conflicts.length)
    throw new SpecWitError('INIT_CONFLICT', `No files changed. These files are not managed by SpecWit or contain local edits: ${conflicts.join(', ')}. Preserve your edits and reconcile them before rerunning init; there is no force overwrite.`)

  let context = config.context ?? ''
  if (previous) {
    const oldBlock = contextBlock(previous.configPatch.context, previous.schema)
    const markersValid = ['specwit', legacySchemaName].every(name =>
      ['start', 'end'].every(end => context.split(`<!-- ${name}:context:${end} -->`).length === (name === previous.schema ? 2 : 1)))
    if (!context.includes(oldBlock) || !markersValid)
      throw new SpecWitError('INIT_CONFLICT', 'No files changed. The managed SpecWit context block was edited or removed; reconcile openspec/config.yaml before rerunning init.')
    context = context.replace(oldBlock, contextBlock(patch.context))
  }
  else {
    if (['specwit', legacySchemaName].some(name => context.includes(`<!-- ${name}:context:`))) throw new SpecWitError('INIT_CONFLICT', 'Unowned workflow context marker in openspec/config.yaml; no files changed.')
    context = `${context}${context && !context.endsWith('\n') ? '\n' : ''}${contextBlock(patch.context)}\n`
  }
  if (Buffer.byteLength(context) > 50 * 1024)
    throw new SpecWitError('CONTEXT_TOO_LARGE', 'Merged OpenSpec context exceeds 50 KiB. Shorten project context before initializing SpecWit.')
  document.set('schema', 'specwit')
  document.set('context', context)
  // Preserve existing YAML nodes/comments and user guidance. Replace only the
  // exact operation entries recorded in the previous installation manifest.
  const operations = document.get('operations', true)
  if (operations !== undefined && !isMap(operations)) throw new SpecWitError('INVALID_OPENSPEC_CONFIG', 'operations must be a YAML mapping, not an alias.')
  for (const operation of ['apply', 'archive'] as const) {
    const node = document.getIn(['operations', operation], true)
    if (node !== undefined && !isMap(node)) throw new SpecWitError('INVALID_OPENSPEC_CONFIG', `operations.${operation} must be a mapping, not an alias.`)
    const keys = ['operations', operation, 'guidance']
    const guidance = document.getIn(keys, true)
    if (guidance !== undefined && !isSeq(guidance)) throw new SpecWitError('INVALID_OPENSPEC_CONFIG', `operations.${operation}.guidance must be a sequence, not an alias.`)
    const oldEntries = previous?.configPatch.operations[operation] ?? []
    if (oldEntries.some(entry => !isSeq(guidance) || !guidance.items.some((_, index) => guidance.get(index) === entry)))
      throw new SpecWitError('INIT_CONFLICT', `No files changed. Managed operations.${operation}.guidance was edited or removed; reconcile it before rerunning init.`)
    if (isSeq(guidance)) {
      for (let index = guidance.items.length - 1; index >= 0; index--) {
        if (oldEntries.includes(String(guidance.get(index)))) guidance.delete(index)
      }
      for (const entry of patch.operations[operation]) {
        if (!guidance.items.some((_, index) => guidance.get(index) === entry)) guidance.add(entry)
      }
    }
    else document.setIn(keys, document.createNode(patch.operations[operation]))
  }

  const project: Project = {
    schemaVersion: 1, toolVersion: VERSION, language: selected, schema: 'specwit', openspecVersion,
    previousSchema: previous?.previousSchema ?? config.schema, configPatch: patch,
    managedFiles: Object.fromEntries(Object.entries(desired).map(([ref, text]) => [ref, sha256(text)])),
  }
  const ignore = optionalText(root, '.gitignore') ?? ''
  const ignoreEntry = '.governance/runtime/'
  if (!ignore.split(/\r?\n/).some(line => [ignoreEntry, `/${ignoreEntry}`].includes(line.trim())))
    desired['.gitignore'] = `${ignore}${ignore && !ignore.endsWith('\n') ? '\n' : ''}${ignoreEntry}\n`
  desired['openspec/config.yaml'] = document.toString({ lineWidth: 0 })
  // Write the binding last: an incomplete installation is never advertised as done.
  desired[bindingRef] = `${JSON.stringify(project, null, 2)}\n`
  const filesWritten = commitFiles(root, desired)
  return {
    schemaVersion: 1, command: 'init', state: filesWritten.length ? 'INITIALIZED' : 'UNCHANGED', root,
    language: selected, schema: 'specwit', openspecVersion, filesWritten, exitCode: 0,
    notes: selected === 'en' ? [
      'Existing changes and OpenSpec-generated agent workflows were preserved. New changes default to the specwit schema.',
      'Configure real bindings and a runner before specwit validate <change> and specwit verify <change>. runner.example.json is documentation only.',
      'Observe results do not provide protected acceptance or Task finalization.',
    ] : [
      '已保留既有 changes 與 OpenSpec 產生的 Agent 流程；新 change 預設使用 specwit schema。',
      '先設定真實 binding 與 runner，再使用 specwit validate <change> 和 specwit verify <change>；runner.example.json 僅供參考。',
      'Observe 結果不提供受保護驗收或 Task 明確完成。',
    ],
  }
}

// Preflight the whole write set and use a lock plus per-file atomic replacements.
// Roll back our own writes on IO failure; never roll back an intervening user edit.
function commitFiles(root: string, desired: Record<string, string>): string[] {
  const changes = Object.entries(desired).map(([ref, after]) => ({ ref, after, before: optionalText(root, ref) })).filter(item => item.before !== item.after)
  if (!changes.length) return []
  const createdDirectories: string[] = []
  function ensureDirectory(directory: string): void {
    if (directory === root) return
    const ref = relative(root, directory).split('\\').join('/')
    const resolved = safePath(root, ref)
    if (hasFile(root, ref)) {
      if (!lstatSync(resolved).isDirectory()) throw new SpecWitError('INVALID_DIRECTORY', `Not a directory: ${ref}`)
      return
    }
    ensureDirectory(dirname(directory))
    mkdirSync(resolved)
    createdDirectories.push(resolved)
  }
  function write(ref: string, content: string): void {
    const destination = safePath(root, ref)
    ensureDirectory(dirname(destination))
    const mode = hasFile(root, ref) ? lstatSync(destination).mode & 0o777 : 0o644
    const temp = `${destination}.${randomUUID()}.tmp`
    try {
      writeFileSync(temp, content, { flag: 'wx', mode })
      renameSync(temp, safePath(root, ref))
    }
    finally {
      try { unlinkSync(temp) }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    }
  }
  const written: typeof changes = []
  let lock: number | undefined
  const lockPath = safePath(root, '.governance/.init.lock')
  let committed = false
  try {
    ensureDirectory(dirname(lockPath))
    try { lock = openSync(lockPath, 'wx', 0o600) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new SpecWitError('INIT_LOCKED', 'Another init is running, or a previous process left .governance/.init.lock. Check that process before removing the lock.')
      throw error
    }
    for (const item of changes) {
      if (optionalText(root, item.ref) !== item.before) throw new SpecWitError('INIT_CONFLICT', `File changed during init: ${item.ref}`)
      write(item.ref, item.after)
      written.push(item)
    }
    committed = true
    return written.map(item => item.ref)
  }
  catch (error) {
    for (const item of written.reverse()) {
      if (optionalText(root, item.ref) !== item.after) continue
      if (item.before === null) unlinkSync(safePath(root, item.ref))
      else write(item.ref, item.before)
    }
    throw error
  }
  finally {
    if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath) }
    if (!committed) for (const directory of createdDirectories.reverse()) {
      try { rmdirSync(directory) }
      catch { /* Never remove a directory that now contains someone else's files. */ }
    }
  }
}
