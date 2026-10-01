import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const scanner = process.env.GITLEAKS_BIN || 'gitleaks'
const args = process.argv.slice(2)
if (args.length && (args.length !== 2 || args[0] !== '--artifact')) throw new Error('Usage: node scripts/check-secrets.mjs [--artifact package.tgz]')
const temporary = mkdtempSync(join(tmpdir(), 'specwit-secret-scan-'))
const scanRoot = join(temporary, 'input')
const privacy = []
const counts = { workingFiles: 0, gitBlobs: 0, gitCommits: 0, gitTags: 0, archives: 0 }
const output = join(root, 'artifacts/security/latest.json')

function git(argv) {
  const result = spawnSync('git', argv, { cwd: root, maxBuffer: 128 * 1024 * 1024 })
  if (result.status !== 0 || result.error) throw new Error(`Git inventory failed: ${argv[0]}`)
  return result.stdout
}
function inspectPrivacy(buffer, file, kind) {
  const lines = buffer.toString('utf8').replaceAll('\\/', '/').split('\n')
  for (const [index, line] of lines.entries()) {
    if (/\/(?:Users|home)\/[A-Za-z0-9._-]+(?=\/|\b)/.test(line)) privacy.push({ file, line: index + 1, type: 'personal-absolute-path' })
    if (kind === 'commit' && /^(?:author|committer) /.test(line)) {
      const email = /<([^>]+)>/.exec(line)?.[1] ?? ''
      if (!/@(?:users\.)?noreply\.github\.com$|@[^@]+\.invalid$/.test(email)) privacy.push({ file, line: index + 1, type: 'identifying-author-email' })
    }
  }
}
function save(ref, buffer, kind) {
  const destination = join(scanRoot, ref)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, buffer, { mode: 0o600 })
  inspectPrivacy(buffer, ref, kind)
}

try {
  const version = spawnSync(scanner, ['version'], { encoding: 'utf8', timeout: 10000 })
  if (version.status !== 0 || version.error) throw new Error('Install Gitleaks (tested with 8.30.1), or set GITLEAKS_BIN to its executable. No scanner is downloaded automatically.')
  const files = new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean))
  for (const ref of files) {
    const source = join(root, ref)
    if (!existsSync(source)) continue // A deleted tracked file is still scanned through Git objects.
    if (!lstatSync(source).isFile()) throw new Error(`Scan requires a regular file: ${ref}`)
    save(`working/${ref}`, readFileSync(source), 'file')
    counts.workingFiles++
  }
  // Includes all local objects, even reflog-only and unreachable history.
  const objects = git(['cat-file', '--batch-all-objects', '--batch-check=%(objectname) %(objecttype) %(objectsize)']).toString().trim().split('\n')
  for (const line of objects) {
    const [oid, kind, size] = line.split(' ')
    if (!['blob', 'commit', 'tag'].includes(kind)) continue
    if (Number(size) > 128 * 1024 * 1024) throw new Error(`Object ${oid} exceeds this scanner's 128 MiB limit; scan incomplete.`)
    save(`objects/${oid}.${kind}`, git(['cat-file', kind, oid]), kind)
    counts[kind === 'blob' ? 'gitBlobs' : kind === 'commit' ? 'gitCommits' : 'gitTags']++
  }
  if (args.length) {
    const artifact = resolve(root, args[1])
    if (!lstatSync(artifact).isFile()) throw new Error('Artifact must be a regular file.')
    mkdirSync(join(scanRoot, 'artifacts'), { recursive: true })
    copyFileSync(artifact, join(scanRoot, 'artifacts/package.tgz'))
    counts.archives++
  }
  const report = join(temporary, 'gitleaks.json')
  const noIgnores = join(temporary, '.gitleaksignore')
  writeFileSync(noIgnores, '')
  const scan = spawnSync(scanner, ['dir', scanRoot, '--config', join(root, '.gitleaks.toml'), '--redact=100', '--no-banner', '--no-color', '--ignore-gitleaks-allow', '--gitleaks-ignore-path', noIgnores, '--max-decode-depth=5', '--max-archive-depth=3', '--timeout=120', '--report-format=json', '--report-path', report], { encoding: 'utf8', timeout: 125000, maxBuffer: 1024 * 1024 })
  if (scan.error || ![0, 1].includes(scan.status) || !existsSync(report)) throw new Error('Gitleaks could not finish; no clean result can be reported.')
  const findings = JSON.parse(readFileSync(report, 'utf8'))
  if (scan.status === 1 && findings.length === 0) throw new Error('Gitleaks failed without a findings report; scan incomplete.')
  const summary = {
    scannedAt: new Date().toISOString(), scanner: `Gitleaks ${version.stdout.trim()}`, counts,
    secretFindings: findings.map(item => ({ rule: item.RuleID, file: relative(scanRoot, item.File), line: item.StartLine })),
    privacyFindings: privacy,
    scope: 'Git-tracked and non-ignored working files, every local Git blob/commit/tag, and an optional npm archive. Ignored local files and external backups are excluded.',
  }
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify({ scanner: summary.scanner, counts, secrets: findings.length, privacy: privacy.length, report: 'artifacts/security/latest.json' }))
  for (const finding of [...summary.secretFindings, ...privacy]) console.log(JSON.stringify(finding))
  process.exitCode = findings.length || privacy.length ? 1 : 0
}
finally { rmSync(temporary, { recursive: true, force: true }) }
