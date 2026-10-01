import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Only disposable copies are mutated. This probes OpenSpec, not product behavior.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = 'daily-check-in'
const cli = process.env.OPENSPEC_BIN || 'openspec'
const env = { ...process.env, OPENSPEC_TELEMETRY: '0', OPENSPEC_NO_UPDATE_CHECK: '1' }
const workspace = mkdtempSync(join(tmpdir(), 'specwit-openspec-example-'))
let passed = 0

function run(args, cwd = workspace) {
  const result = spawnSync(cli, args, { cwd, env, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024 })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${cli} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`)
  return result.stdout.trim()
}

function json(args) {
  return JSON.parse(run([...args, '--json']))
}

function check(name, fn) {
  fn()
  passed++
  console.log(`PASS ${name}`)
}

try {
  assert.equal(run(['--version'], root), '1.14.0', 'This example was verified with OpenSpec 1.14.0; review differences before updating the probe.')
  cpSync(join(root, 'openspec'), join(workspace, 'openspec'), { recursive: true })
  const change = join(workspace, 'openspec', 'changes', fixture)
  const status = () => json(['status', '--change', fixture])
  const apply = () => json(['instructions', 'apply', '--change', fixture])
  const artifactIds = ['proposal', 'specs', 'behavior-plan', 'design', 'verification-contract', 'tasks']
  const contractPath = join(change, 'verification-contract.json')
  const contractText = readFileSync(contractPath, 'utf8')
  const contract = JSON.parse(contractText)
  const tasksPath = join(change, 'tasks.md')
  const tasksText = readFileSync(tasksPath, 'utf8')

  check('custom schema resolves locally and validates', () => {
    assert.equal(json(['schema', 'which', 'governed-delivery']).source, 'project')
    assert.equal(json(['schema', 'validate', 'governed-delivery']).valid, true)
    assert.equal(status().schemaName, 'governed-delivery')
    assert.deepEqual(status().artifacts.map(item => item.id), artifactIds)
  })

  check('fixture spec passes strict structural validation', () => {
    assert.equal(json(['validate', fixture, '--strict']).items[0].valid, true)
    const source = readFileSync(join(root, contract.sources[0].ref))
    assert.equal(createHash('sha256').update(source).digest('hex'), contract.sources[0].sha256)
  })

  check('each artifact receives context, rules and its template', () => {
    for (const id of artifactIds) {
      const instruction = json(['instructions', id, '--change', fixture])
      assert.match(instruction.context, /Observe/)
      assert.ok(instruction.rules.length > 0, `${id} rules are missing`)
      assert.ok(instruction.template.trim().length > 0)
      if (id === 'verification-contract') JSON.parse(instruction.template)
    }
  })

  check('apply and archive receive their distinct operation guidance', () => {
    assert.ok(apply().operationGuidance.some(item => item.includes('BLOCKED_EXTERNAL')))
    assert.ok(json(['instructions', 'archive', '--change', fixture]).operationGuidance.some(item => item.includes('COMPLETED')))
  })

  check('G01: PENDING confirmation and missing binding still yield apply ready', () => {
    assert.equal(contract.confirmation.status, 'PENDING')
    assert.equal(contract.binding.status, 'MISSING')
    assert.equal(apply().state, 'ready')
    assert.equal(apply().progress.complete, 0)
  })

  check('explicit apply.requires blocks a missing planning artifact', () => {
    const designPath = join(change, 'design.md')
    const design = readFileSync(designPath, 'utf8')
    rmSync(designPath)
    const missing = apply()
    assert.equal(missing.state, 'blocked')
    assert.ok(missing.missingArtifacts.includes('design'))
    writeFileSync(designPath, design)
  })

  check('G02: invalid custom JSON still counts as done and passes spec validation', () => {
    writeFileSync(contractPath, '{ invalid JSON')
    assert.equal(status().artifacts.find(item => item.id === 'verification-contract').status, 'done')
    assert.equal(apply().state, 'ready')
    assert.equal(json(['validate', fixture, '--strict']).items[0].valid, true)
    writeFileSync(contractPath, contractText)
  })

  check('G05: an upstream plan edit does not invalidate downstream artifacts', () => {
    const planPath = join(change, 'behavior-plan.md')
    const plan = readFileSync(planPath, 'utf8')
    writeFileSync(planPath, `${plan}\nChanged plan for disposable probe.\n`)
    assert.ok(status().artifacts.every(item => item.status === 'done'))
    writeFileSync(planPath, plan)
  })

  check('G06: checked tasks yield all_done without any execution evidence', () => {
    assert.equal(existsSync(join(workspace, '.governance', 'runtime')), false)
    writeFileSync(tasksPath, tasksText.replaceAll('- [ ]', '- [x]'))
    assert.equal(apply().state, 'all_done')
    writeFileSync(tasksPath, tasksText)
  })

  check('G08: archive --yes retains files despite pending tasks and confirmation', () => {
    assert.ok(apply().progress.remaining > 0)
    run(['archive', fixture, '--yes'])
    const archiveRoot = join(workspace, 'openspec', 'changes', 'archive')
    const archived = readdirSync(archiveRoot).find(name => name.endsWith(`-${fixture}`))
    assert.ok(archived)
    const archivedContract = JSON.parse(readFileSync(join(archiveRoot, archived, 'verification-contract.json'), 'utf8'))
    assert.equal(archivedContract.confirmation.status, 'PENDING')
    assert.ok(readFileSync(join(archiveRoot, archived, 'tasks.md'), 'utf8').includes('- [ ]'))
    assert.equal(existsSync(join(workspace, 'openspec', 'specs', 'daily-check-in', 'spec.md')), true)
  })

  assert.equal(readFileSync(join(root, 'openspec', 'changes', fixture, 'tasks.md'), 'utf8'), tasksText)
  assert.equal(readFileSync(join(root, 'openspec', 'changes', fixture, 'verification-contract.json'), 'utf8'), contractText)
  console.log(`\n${passed} checks passed. No product tests, trusted verification or finalization were performed.`)
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
