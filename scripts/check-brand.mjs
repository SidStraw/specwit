import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const oldName = /\b(?:GOV|Gov|gov|govd)\b|GOV_|gov_|GovError|@gov\/cli/
// Reviewed exceptions: exact files only; current prompts and templates have none.
const historical = new Map([
  ['docs/source/original-draft.md', 'unaltered original specification'],
  ['packages/cli/CHANGELOG.md', 'historical release names'],
  ['packages/cli/MIGRATION.md', 'English migration mapping'],
  ['packages/cli/MIGRATION.zh-TW.md', 'Traditional Chinese migration mapping'],
  ['packages/cli/src/compat.ts', 'persisted schema and runner environment compatibility'],
  ['packages/cli/tests/fixtures/legacy-gov-init.json', 'frozen pre-rename installation'],
  ['packages/cli/tests/migration.test.ts', 'legacy fixture and environment regression checks'],
  ['packages/cli/scripts/smoke-openspec.mjs', 'frozen fixture in the real OpenSpec migration probe'],
  ['scripts/check-brand.mjs', 'audit patterns and explicit exception list'],
  ['scripts/package-example.mjs', 'removal of obsolete build filenames'],
])
const unexpected = []
const retained = new Map()
const inventory = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
if (inventory.status !== 0 || inventory.error) throw new Error('Could not inventory repository files.')
for (const ref of new Set(inventory.stdout.split('\0').filter(Boolean))) {
  const path = join(root, ref)
  if (!existsSync(path) || !lstatSync(path).isFile()) continue
  const lines = readFileSync(path, 'utf8').split('\n')
  for (const [index, line] of lines.entries()) {
    if (!oldName.test(line)) continue
    const reason = historical.get(ref) ?? (ref === 'docs/source-map.md' && line.startsWith('| 12 | govd（歷史名稱） |') ? 'historical source heading' : undefined)
    if (reason) retained.set(ref, reason)
    else unexpected.push(`${ref}:${index + 1}`)
  }
}
if (unexpected.length) {
  console.error(`Unexpected legacy branding:\n${unexpected.join('\n')}`)
  process.exitCode = 1
}
else console.log('PASS: no unexpected legacy branding in maintained source, templates, examples or documentation.')
for (const [ref, reason] of retained) console.log(`Retained: ${ref} (${reason})`)
