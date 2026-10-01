import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { SpecWitError } from './model'

export const MAX_FILE_BYTES = 16 * 1024 * 1024

export function projectRoot(path: string): string {
  const root = realpathSync(resolve(path))
  if (!lstatSync(root).isDirectory()) throw new SpecWitError('INVALID_ROOT', 'Project root must be a directory.')
  safePath(root, 'openspec')
  return root
}

export function validId(id: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id === 'archive')
    throw new SpecWitError('INVALID_TASK_ID', 'Change name must be kebab-case and cannot be archive.')
  return id
}

// Resolve every existing component; symlink confinement is best-effort, not OS isolation.
export function safePath(root: string, ref: string): string {
  const parts = ref.replace(/\/$/, '').split('/')
  if (!ref || isAbsolute(ref) || ref.includes('\\') || parts.some(part => !part || part === '.' || part === '..') || /^[a-z]:/i.test(ref))
    throw new SpecWitError('UNSAFE_PATH', 'Use project-relative paths without .. or backslashes.')
  let path = root
  for (const part of parts) {
    path = join(path, part)
    try {
      if (lstatSync(path).isSymbolicLink()) throw new SpecWitError('UNSAFE_PATH', `Symlink paths are not supported: ${ref}`)
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return path
}

export function readText(root: string, ref: string): string {
  const path = safePath(root, ref)
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new SpecWitError('INVALID_FILE', `Not a regular file, or larger than 16 MiB: ${ref}`)
  return readFileSync(path, 'utf8')
}

export function readJson(root: string, ref: string): unknown {
  const text = readText(root, ref)
  if (Buffer.byteLength(text) > 1024 * 1024) throw new SpecWitError('INVALID_DATA', `JSON exceeds 1 MiB: ${ref}`)
  try { return JSON.parse(text) }
  catch { throw new SpecWitError('INVALID_JSON', `Cannot parse JSON: ${ref}`) }
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

export function fileDigest(root: string, ref: string): string {
  const path = safePath(root, ref)
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new SpecWitError('INVALID_FILE', `Not a regular file, or larger than 16 MiB: ${ref}`)
  return sha256(readFileSync(path))
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}

export function filesUnder(root: string, ref: string): string[] {
  const found: string[] = []
  function walk(entry: string): void {
    const path = safePath(root, entry)
    const stat = lstatSync(path)
    if (found.length >= 10000) throw new SpecWitError('TOO_MANY_FILES', 'Each input directory may contain at most 10,000 files.')
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) {
        if (name === '.git' || name === 'node_modules') continue
        walk(`${entry.replace(/\/$/, '')}/${name}`)
      }
    }
    else if (stat.isFile()) found.push(relative(root, path).split('\\').join('/'))
    else throw new SpecWitError('INVALID_FILE', `Unsupported file type: ${entry}`)
  }
  walk(ref)
  return found
}

export function writeJson(root: string, ref: string, value: unknown): void {
  const content = `${JSON.stringify(value, null, 2)}\n`
  if (Buffer.byteLength(content) > 1024 * 1024) throw new SpecWitError('OUTPUT_LIMIT', 'Run record exceeds 1 MiB; preserve the previous readable record.')
  const path = safePath(root, ref)
  mkdirSync(dirname(path), { recursive: true })
  safePath(root, ref)
  const temp = `${path}.${randomUUID()}.tmp`
  writeFileSync(temp, content, { flag: 'wx', mode: 0o600 })
  renameSync(temp, path)
}

export function hasFile(root: string, ref: string): boolean {
  return existsSync(safePath(root, ref))
}
