import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const binary = fileURLToPath(new URL('../dist/specwit.mjs', import.meta.url))
const legacy = fileURLToPath(new URL('../tests/fixtures/legacy-project/', import.meta.url))
const executable = process.env.OPENSPEC_BIN || 'openspec'
const openspec = /\.[cm]?js$/i.test(executable) ? [process.execPath, executable] : [executable]
const env = { ...process.env, OPENSPEC_TELEMETRY: '0', OPENSPEC_NO_UPDATE_CHECK: '1' }
function run(root, command, args, expected = 0) {
  const result = spawnSync(command[0], [...command.slice(1), ...args], { cwd: root, env, encoding: 'utf8', timeout: 30000 })
  assert.equal(result.status, expected, `${command.join(' ')} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`)
  return result.stdout
}
const temporary = mkdtempSync(join(tmpdir(), 'specwit-real-openspec-'))
try {
  const version = run(temporary, openspec, ['--version']).trim()
  assert.equal(version, '1.14.0', 'Update and review this compatibility smoke test before changing its baseline version.')
  const refused = JSON.parse(run(temporary, [process.execPath, binary], ['init', '--json'], 3))
  assert.equal(refused.issues[0].code, 'OPENSPEC_NOT_INITIALIZED')
  assert.equal(existsSync(join(temporary, '.governance')), false)
  for (const language of ['en', 'zh-TW']) {
    const root = mkdtempSync(join(temporary, `${language}-`))
    run(root, openspec, ['init', '--tools', 'opencode', '--profile', 'core', '--language', language, '--no-animation'])
    const skill = join(root, '.opencode/skills/openspec-propose/SKILL.md')
    const beforeSkill = readFileSync(skill, 'utf8')
    const init = JSON.parse(run(root, [process.execPath, binary], ['init', '--language', language, '--json']))
    assert.equal(init.language, language)
    assert.equal(readFileSync(skill, 'utf8'), beforeSkill)
    assert.equal(JSON.parse(run(root, openspec, ['schema', 'which', 'specwit', '--json'])).source, 'project')
    assert.equal(JSON.parse(run(root, openspec, ['schema', 'validate', 'specwit', '--json'])).valid, true)
    const change = `smoke-${language.toLowerCase()}`
    run(root, openspec, ['new', 'change', change])
    assert.match(readFileSync(join(root, 'openspec/changes', change, '.openspec.yaml'), 'utf8'), /schema: specwit/)
    for (const artifact of ['proposal', 'specs', 'behavior-plan', 'design', 'verification-contract', 'tasks']) {
      const instruction = JSON.parse(run(root, openspec, ['instructions', artifact, '--change', change, '--json']))
      assert.ok(instruction.template.length > 0)
      assert.match(instruction.context, language === 'en' ? /Use English/ : /台灣繁體中文/)
      if (artifact === 'verification-contract') {
        const contract = JSON.parse(instruction.template)
        assert.equal(contract.schemaVersion, '0.1')
        assert.equal(contract.confirmation.status, 'PENDING')
        assert.equal(contract.review.schemaRef, '.governance/contracts/review-result.schema.json')
      }
    }
    // Exercise an existing change without migrating or silently approving it.
    for (const ref of ['fixtures', 'contracts']) cpSync(join(legacy, ref), join(root, ref), { recursive: true })
    cpSync(join(legacy, 'openspec/changes/daily-check-in'), join(root, 'openspec/changes/daily-check-in'), { recursive: true })
    cpSync(join(legacy, 'openspec/schemas/governed-delivery'), join(root, 'openspec/schemas/governed-delivery'), { recursive: true })
    const validation = JSON.parse(run(root, [process.execPath, binary], ['validate', 'daily-check-in', '--json'], 2))
    assert.equal(validation.state, 'BLOCKED')
    assert.ok(validation.issues.some(issue => issue.code === 'CONFIRMATION_PENDING'))
    assert.equal(existsSync(join(root, '.governance/runtime')), false)
    const apply = JSON.parse(run(root, openspec, ['instructions', 'apply', '--change', 'daily-check-in', '--json']))
    assert.ok(apply.operationGuidance.some(entry => entry.includes('specwit validate')))
    assert.equal(JSON.parse(run(root, [process.execPath, binary], ['init', '--json'])).state, 'UNCHANGED')
    console.log(`PASS OpenSpec ${version}: ${language} init, schema, six artifact instructions, guidance, legacy validation, idempotence`)
  }
  const migrated = mkdtempSync(join(temporary, 'migration-'))
  run(migrated, openspec, ['init', '--tools', 'opencode', '--profile', 'core', '--language', 'en', '--no-animation'])
  const frozen = JSON.parse(readFileSync(new URL('../tests/fixtures/legacy-gov-init.json', import.meta.url), 'utf8'))
  for (const [ref, content] of Object.entries(frozen.files)) {
    mkdirSync(dirname(join(migrated, ref)), { recursive: true })
    writeFileSync(join(migrated, ref), content)
  }
  const prior = JSON.parse(frozen.files['.governance/config.json'])
  run(migrated, openspec, ['new', 'change', 'existing-task'])
  const metadataRef = join(migrated, 'openspec/changes/existing-task/.openspec.yaml')
  const before = readFileSync(metadataRef, 'utf8')
  run(migrated, [process.execPath, binary], ['init', '--json'])
  assert.equal(readFileSync(metadataRef, 'utf8'), before)
  assert.equal(JSON.parse(run(migrated, openspec, ['schema', 'validate', prior.schema, '--json'])).valid, true)
  const instructions = JSON.parse(run(migrated, openspec, ['instructions', 'tasks', '--change', 'existing-task', '--json']))
  assert.ok(instructions.template.includes('specwit validate'))
  assert.equal(JSON.parse(run(migrated, [process.execPath, binary], ['init', '--json'])).state, 'UNCHANGED')
  console.log(`PASS OpenSpec ${version}: migrated existing schema remains resolvable with current CLI instructions`)
}
finally { rmSync(temporary, { recursive: true, force: true }) }
