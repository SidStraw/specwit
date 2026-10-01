import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const example = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = join(example, 'dist/gov.mjs')
const source = join(example, 'demo')
const task = 'check-in-cli-demo'
const openspec = process.env.OPENSPEC_BIN || 'openspec'
const env = { ...process.env, OPENSPEC_TELEMETRY: '0', OPENSPEC_NO_UPDATE_CHECK: '1' }
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const read = path => JSON.parse(readFileSync(path, 'utf8'))
const put = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}
const quote = value => `'${value.replaceAll("'", "'\\''")}'`
if (!existsSync(bundle)) throw new Error('缺少 example/dist/gov.mjs；請先在儲存庫根目錄執行 pnpm cli:pack。')

function execute(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.signal) throw new Error(`${command} 被 ${result.signal} 中斷`)
  return result
}
const version = execute(openspec, ['--version'], example)
assert.equal(version.status, 0, version.stderr)
assert.equal(version.stdout.trim(), '1.14.0', '此示範預期 OpenSpec 1.14.0；升級後需先核對行為。')

mkdirSync(join(example, 'demo-output'), { recursive: true })
const session = mkdtempSync(join(example, 'demo-output/run-'))
const project = join(session, 'project')
mkdirSync(project)
const steps = []
const originalContract = join(example, 'openspec/changes/daily-check-in/verification-contract.json')
const originalTasks = join(example, 'openspec/changes/daily-check-in/tasks.md')
const originalDigests = [hash(originalContract), hash(originalTasks)]

function capture(title, command, args, cwd, expectedExit, expectedState, detail, stateOf = value => value.state) {
  const result = execute(command, args, cwd)
  assert.equal(result.status, expectedExit, `${title}\n${result.stderr}\n${result.stdout}`)
  const output = JSON.parse(result.stdout)
  const state = stateOf(output)
  assert.equal(state, expectedState, title)
  const number = String(steps.length + 1).padStart(2, '0')
  const file = `steps/${number}.json`
  put(join(session, file), output)
  steps.push({ number, title, command: [command, ...args], cwd, state, exitCode: result.status, detail, file })
  console.log(`${number}. ${title} → ${state} (exit ${result.status})\n    ${detail}`)
  return output
}
function gov(title, args, expectedExit, expectedState, detail, cwd = project, change = task) {
  return capture(title, process.execPath, [bundle, args[0], change, ...args.slice(1), '--root', cwd, '--json'], cwd, expectedExit, expectedState, detail)
}
function planning(title, cwd, change, detail) {
  const statusResult = execute(openspec, ['status', '--change', change, '--json'], cwd)
  assert.equal(statusResult.status, 0, statusResult.stderr)
  const status = JSON.parse(statusResult.stdout)
  assert.equal(status.artifacts.length, 6)
  assert.ok(status.artifacts.every(item => item.status === 'done'))
  put(join(session, `planning-${steps.length + 1}.json`), status)
  return capture(title, openspec, ['instructions', 'apply', '--change', change, '--json'], cwd, 0, 'ready', detail)
}
function reviewFor(run) {
  return {
    schemaVersion: 1, taskId: task, runId: run.runId, planDigest: run.planDigest, candidateDigest: run.candidateDigest,
    response: {
      schemaVersion: 1,
      assessments: [{
        criterionId: 'demo-evidence', verdict: 'meets', confidence: 0.5,
        rationale: 'Synthetic fixture：只展示接收端對目前 Run 證據的引用檢查，不是模型或人工結論。',
        evidenceIds: ['check:B01', 'check:B02'],
        limitations: ['synthetic demo only', '沒有 reviewer 模型或身分驗證', '只涵蓋無 UI 的小型模型'],
      }],
    },
  }
}

let completed = false
try {
  console.log('OpenSpec＋gov 示範：實際執行小型模型；確認與 review 為 synthetic fixture。\n')
  planning('原教學 change 的 OpenSpec 規劃', example, 'daily-check-in', '六個規劃產物 done，apply ready；這不是實作驗收。')
  const blocked = gov('原教學 change 的 gov 檢查', ['check'], 2, 'BLOCKED', '確認、binding/verifier、runner 與摘要尚未準備。', example, 'daily-check-in')
  assert.ok(blocked.issues.some(item => item.code === 'CONFIRMATION_PENDING'))

  for (const name of ['src', 'checks', 'request.md']) cpSync(join(source, name), join(project, name), { recursive: true })
  cpSync(join(source, 'governance'), join(project, '.governance'), { recursive: true })
  cpSync(join(source, 'change'), join(project, 'openspec/changes', task), { recursive: true })
  cpSync(join(example, 'openspec/schemas'), join(project, 'openspec/schemas'), { recursive: true })
  cpSync(join(example, 'openspec/config.yaml'), join(project, 'openspec/config.yaml'))
  cpSync(join(example, 'contracts'), join(project, 'contracts'), { recursive: true })
  writeFileSync(join(project, 'README.md'), `# 可操作的簽到模型示範\n\n這是由 example/scripts/demo.mjs 建立的獨立副本。原始教學 change 未變更；確認及 reviewer 回覆都是 synthetic fixture。\n\n[本次實際結果與完整指令](../RESULTS.md)、[Runner](.governance/runner.json)、[模型](src/check-in.mjs)、[檢查](checks/check-in.mjs)。\n\n執行入口：node ${quote(bundle)}；Task：${task}。這份副本可用 OpenSpec CLI 查看規劃，沒有另外安裝 OpenCode skills。\n`)
  writeFileSync(join(project, 'WORKFLOW.md'), `# 示範操作\n\n先看 README.md 及 ../RESULTS.md。OpenSpec 管理規劃；以 node ${quote(bundle)} check/verify/status ${task} 取得 Observe 結果。修改 src 後需重新 verify；必要 review 的 envelope 必須綁定該次 Run。complete 僅預覽，不清理或完成 Task。\n`)
  writeFileSync(join(project, 'GAPS.md'), '# 示範界線\n\n模型只涵蓋 pending 去重與回應 reward，沒有 UI、API 或真實產品。確認與 review 是 synthetic fixture；沒有身分驗證、執行隔離、模型評估、CI publisher 或 finalizer。結果只能作 Observe 參考。\n')
  writeFileSync(join(project, '.gitignore'), '.governance/runtime/\n')

  const contractPath = join(project, 'openspec/changes', task, 'verification-contract.json')
  const contract = read(contractPath)
  contract.sources[0].sha256 = hash(join(project, contract.sources[0].ref))
  for (const name of ['policy', 'binding', 'verifier']) contract[name].digest = hash(join(project, contract[name].ref))
  put(contractPath, contract)
  const before = gov('示範接法已補齊、尚未記錄確認', ['check'], 2, 'BLOCKED', 'gov 計算真正 planDigest，未記錄確認時仍阻擋。')
  put(join(project, '.governance/demo-confirmation.json'), {
    synthetic: true, purpose: 'CLI integration demo only; not a human approval', planDigest: before.planDigest,
  })
  contract.planDigest = before.planDigest
  contract.confirmation = { status: 'CONFIRMED', sourceRef: '.governance/demo-confirmation.json', confirmedPlanDigest: before.planDigest }
  put(contractPath, contract)

  planning('示範模型的 OpenSpec 規劃', project, task, '獨立的 R01/R02 模型，六個規劃產物 done；四項 tasks 保持未勾選。')
  const validSpec = execute(openspec, ['validate', task, '--strict', '--json'], project)
  assert.equal(validSpec.status, 0, validSpec.stderr)
  assert.equal(JSON.parse(validSpec.stdout).items[0].valid, true)
  gov('示範確認 fixture 與版本對應完成', ['check'], 0, 'READY', '只有新副本填入 synthetic 確認；不代表真人核准。')
  const first = gov('執行正常程式', ['verify'], 2, 'BLOCKED', 'B01、B02 實際執行皆 PASS；必要 review 未匯入，所以整體仍阻擋。')
  assert.ok(first.run.checks.every(item => item.verdict === 'PASS'))
  assert.ok(first.issues.some(item => item.code === 'REVIEW_NOT_RUN'))
  const invalid = reviewFor(first.run)
  invalid.response.assessments[0].evidenceIds = ['check:NOT-FOUND']
  put(join(project, 'demo-review.json'), invalid)
  const rejected = gov('匯入引用不存在證據的 review', ['verify', '--run', first.run.runId, '--review', 'demo-review.json'], 2, 'BLOCKED', 'JSON 格式合法也不夠，UNKNOWN_EVIDENCE 會阻擋。')
  assert.ok(rejected.issues.some(item => item.code === 'UNKNOWN_EVIDENCE'))
  put(join(project, 'demo-review.json'), reviewFor(first.run))
  gov('匯入引用正確的 synthetic review', ['verify', '--run', first.run.runId, '--review', 'demo-review.json'], 0, 'PASS', '同 Run 的 B01/B02 引用齊全；仍為 Observe、eligible=false。')

  const modulePath = join(project, 'src/check-in.mjs')
  const goodCode = readFileSync(modulePath, 'utf8')
  assert.ok(goodCode.includes('if (pending || completed) return false'))
  writeFileSync(modulePath, goodCode.replace('if (pending || completed) return false', 'if (completed) return false'))
  gov('移除 pending guard 後查看舊結果', ['status'], 2, 'STALE', '產品輸入已變，原 PASS 不能套用到目前程式。')
  planning('缺陷存在時的 OpenSpec 規劃', project, task, '規劃產物仍 done、apply 仍 ready；OpenSpec 沒有執行這兩項檢查。')
  const failure = gov('對缺陷版本建立新 Run', ['verify'], 1, 'FAIL', 'B01 實際觀察到兩筆請求而非一筆；B02 仍 PASS。')
  assert.equal(failure.run.checks.find(item => item.checkId === 'B01').verdict, 'FAIL')
  assert.equal(failure.run.checks.find(item => item.checkId === 'B02').verdict, 'PASS')
  assert.ok(failure.run.checks.find(item => item.checkId === 'B01').observations.some(item => item.includes('實際請求數=2')))
  assert.notEqual(first.run.runId, failure.run.runId)

  writeFileSync(modulePath, goodCode)
  const repaired = gov('還原 guard 並重新驗證', ['verify'], 2, 'BLOCKED', '新的 Run 中 B01/B02 回到 PASS；舊 Run 的 review 不能沿用。')
  assert.ok(repaired.run.checks.every(item => item.verdict === 'PASS'))
  assert.ok(repaired.issues.some(item => item.code === 'REVIEW_NOT_RUN'))
  assert.notEqual(repaired.run.runId, first.run.runId)
  assert.notEqual(repaired.run.runId, failure.run.runId)
  put(join(project, 'demo-review.json'), reviewFor(repaired.run))
  const passed = gov('匯入新 Run 的 synthetic review', ['verify', '--run', repaired.run.runId, '--review', 'demo-review.json'], 0, 'PASS', '結果綁定新 Run；runtime 中保留先前失敗與 review attempts。')
  assert.equal(passed.eligible, false)
  const preview = gov('查看完成清理預覽', ['complete', '--dry-run'], 2, 'BLOCKED_EXTERNAL', '缺少受信任 finalizer，僅列出 task-owned 目錄，不刪除。')
  assert.equal(preview.cleanupPreview.executed, false)
  assert.ok(existsSync(contractPath))
  assert.deepEqual([hash(originalContract), hash(originalTasks)], originalDigests)
  completed = true
}
finally {
  const metadata = { completed, generatedAt: new Date().toISOString(), nodeVersion: process.version, openspecVersion: version.stdout.trim(), bundleSha256: hash(bundle), project, syntheticConfirmationAndReview: true, steps }
  put(join(session, 'results.json'), metadata)
  const rows = steps.map(step => `| ${step.number} | ${step.title} | ${step.state} | ${step.exitCode} | ${step.detail} |`).join('\n')
  const details = steps.map(step => `### ${step.number}. ${step.title}\n\n${step.detail}\n\n工作目錄：\`${step.cwd}\`\n\n\`\`\`sh\n${step.command.map(quote).join(' ')}\n\`\`\`\n\n[當次完整 JSON](${step.file})\n`).join('\n')
  const remaining = completed ? '最後保留修正後的程式與 Observe PASS；完成清理仍為 BLOCKED_EXTERNAL。' : '本次示範中途停止，副本可能仍處於缺陷注入或未驗證狀態，請查看已保存步驟。'
  const content = `# OpenSpec＋gov 實際示範結果\n\n${completed ? '全部示範斷言通過' : '示範中途停止；只記錄已完成的步驟'}。產生時間：${metadata.generatedAt}。\n\n小型模型與檢查實際執行；確認與 review 是 synthetic fixture，不是真人核准或模型評估。原 daily-check-in 契約及 tasks 未改動。\n\n環境：Node ${metadata.nodeVersion}、OpenSpec ${metadata.openspecVersion}。執行包 SHA-256：\`${metadata.bundleSha256}\`。\n\n| 步驟 | 操作 | 結果 | Exit | 看到的效果 |\n|---|---|---|---|---|\n${rows}\n\n## 留下來供你操作的專案\n\n[示範專案](project/)、[目前契約](project/openspec/changes/${task}/verification-contract.json)、[Runner](project/.governance/runner.json)、[產品模型](project/src/check-in.mjs)、[實際 checks](project/checks/check-in.mjs)、[所有 Run](project/.governance/runtime/${task}/)、[完整紀錄](results.json)。\n\n${remaining}下面步驟的 JSON 保存的是當時結果，重跑過去指令會依目前版本重新判斷。\n\n\`\`\`sh\ncd ${quote(project)}\n${quote(process.execPath)} ${quote(bundle)} status ${task}\n${quote(openspec)} status --change ${task}\n\`\`\`\n\n## 各步驟的實際指令與輸出\n\n${details}`
  writeFileSync(join(session, 'RESULTS.md'), content)
  const relativeSession = relative(join(example, 'demo-output'), session)
  writeFileSync(join(example, 'demo-output/RESULTS.md'), `# 最新 OpenSpec＋gov 示範\n\n[開啟完整結果與操作步驟](${relativeSession}/RESULTS.md)\n\n${completed ? '已通過全部示範斷言。' : '本次示範未完成。'}\n\n| 步驟 | 操作 | 結果 | Exit | 看到的效果 |\n|---|---|---|---|---|\n${rows}\n`)
  put(join(example, 'demo-output/latest.json'), { project, report: join(session, 'RESULTS.md'), completed })
  console.log(`\n報告：${join(session, 'RESULTS.md')}\n可繼續操作的專案：${project}`)
}
