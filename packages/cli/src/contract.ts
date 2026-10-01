import Ajv2020 from 'ajv/dist/2020.js'
import type { Contract, Issue, Runner } from './model'
import { canonical, fileDigest, filesUnder, hasFile, readJson, readText, sha256, validId } from './files'
import { contractSchema, parse, runnerSchema } from './model'

export interface Inspection {
  contract: Contract
  runner: Runner | null
  blockers: Issue[]
  humanPending: Issue[]
  planDigest: string
  candidateDigest: string | null
  materials: Record<string, string>
  changeRef: string
  runtimeRef: string
}

export function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}

export function inspect(root: string, taskId: string): Inspection {
  validId(taskId)
  const changeRef = `openspec/changes/${taskId}`
  const runtimeRef = `.governance/runtime/${taskId}`
  const contractRef = `${changeRef}/verification-contract.json`
  const contract = parse(contractSchema, readJson(root, contractRef), contractRef)
  const blockers: Issue[] = []
  const humanPending: Issue[] = []
  const add = (code: string, message: string): void => { blockers.push({ code, message }) }
  const materials: Record<string, string> = Object.create(null)
  const planFiles: Record<string, string> = Object.create(null)
  function material(ref: string, expected?: string | null, plan = true): void {
    try {
      const digest = fileDigest(root, ref)
      materials[ref] = digest
      if (plan) planFiles[ref] = digest
      if (expected !== undefined && expected !== digest) add('DIGEST_MISMATCH', `檔案 digest 不符或未設定：${ref}`)
    }
    catch { add('MISSING_OR_UNSAFE_FILE', `檔案缺失、不支援或路徑不安全：${ref}`) }
  }
  if (contract.taskId !== taskId) add('TASK_MISMATCH', 'contract.taskId 與 change 名稱不一致。')
  if (contract.profile !== 'Observe') add('UNSUPPORTED_PROFILE', '此版本只支援 Observe。')
  for (const name of ['proposal.md', 'behavior-plan.md', 'design.md']) material(`${changeRef}/${name}`)
  if (!hasFile(root, `${changeRef}/tasks.md`)) add('MISSING_TASKS', '缺少 tasks.md。')
  const requirements: string[] = []
  try {
    const specs = filesUnder(root, `${changeRef}/specs`).filter(ref => ref.endsWith('.md'))
    if (!specs.length) add('MISSING_SPECS', '沒有規格檔。')
    for (const ref of specs) {
      material(ref)
      for (const match of readText(root, ref).matchAll(/^### Requirement:\s*(.+)$/gm)) {
        const id = /^([A-Za-z][\w.-]*)\s+-\s+/.exec(match[1])?.[1]
        if (id) requirements.push(id)
        else add('REQUIREMENT_ID_MISSING', `需求標題缺少穩定 ID（格式 ID - 名稱）：${ref}`)
      }
    }
    if (!requirements.length) add('NO_REQUIREMENTS', '沒有可對照的 requirement ID。')
  }
  catch { add('MISSING_SPECS', '無法讀取安全的 specs 目錄。') }
  for (const [label, values] of [
    ['requirement', requirements],
    ['source', contract.sources.map(item => item.id)],
    ['check', contract.expectedChecks.map(item => item.id)],
    ['criterion', contract.review.criteria.map(item => item.id)],
    ['human item', contract.humanItems.map(item => item.id)],
  ] as const) {
    for (const id of duplicates([...values])) add('DUPLICATE_ID', `${label} ID 重複：${id}`)
  }
  const coverage = new Set<string>()
  for (const check of contract.expectedChecks) {
    if (check.readiness !== 'READY') add('CHECK_NOT_READY', `${check.id}：${check.readiness}`)
    for (const id of check.requirementIds) {
      if (!requirements.includes(id)) add('UNKNOWN_REQUIREMENT', `${check.id} 引用不存在的需求：${id}`)
      coverage.add(id)
    }
  }
  for (const item of contract.humanItems) {
    for (const id of item.requirementIds ?? []) {
      if (!requirements.includes(id)) add('UNKNOWN_REQUIREMENT', `${item.id} 引用不存在的需求：${id}`)
      coverage.add(id)
    }
    if (item.status !== 'ACCEPTED' || !item.decisionRef)
      humanPending.push({ code: 'HUMAN_ITEM_PENDING', message: `${item.id} 尚未有接受決策。` })
    if (item.decisionRef) material(item.decisionRef, undefined, false)
  }
  for (const id of requirements) {
    if (!coverage.has(id)) add('UNCOVERED_REQUIREMENT', `需求沒有 check 或人工項目：${id}`)
  }
  for (const source of contract.sources) material(source.ref, source.sha256)
  for (const name of ['policy', 'binding', 'verifier'] as const) {
    const resource = contract[name]
    if ('status' in resource && resource.status !== 'READY') add('RESOURCE_NOT_READY', `${name} 尚未 READY。`)
    if (!resource.ref) add('MISSING_RESOURCE', `${name}.ref 未設定。`)
    else material(resource.ref, resource.digest)
  }
  material(contract.review.schemaRef)
  try {
    new Ajv2020({ strict: true, allErrors: true }).compile(readJson(root, contract.review.schemaRef) as object)
  }
  catch { add('INVALID_REVIEW_SCHEMA', 'review JSON Schema 無效或無法讀取。') }
  if (contract.review.required && !contract.review.criteria.length) add('MISSING_CRITERIA', '必要 review 沒有 criteria。')
  if (!contract.execution.maxAttempts || !contract.execution.timeoutSeconds) add('MISSING_LIMITS', '需設定 maxAttempts 與 timeoutSeconds。')
  if (contract.confirmation.status !== 'CONFIRMED') add('CONFIRMATION_PENDING', '尚未記錄計畫確認。')
  if (!contract.confirmation.sourceRef) add('MISSING_CONFIRMATION_SOURCE', '缺少可核對的確認來源。')
  else material(contract.confirmation.sourceRef, undefined, false)

  let runner: Runner | null = null
  const runnerRef = '.governance/runner.json'
  try {
    runner = parse(runnerSchema, readJson(root, runnerRef), runnerRef)
    material(runnerRef)
    for (const id of duplicates(runner.checks.map(item => item.id))) add('DUPLICATE_RUNNER', `runner check 重複：${id}`)
    const ids = runner.checks.map(item => item.id)
    for (const check of contract.expectedChecks) {
      if (!ids.includes(check.id)) add('MISSING_RUNNER', `${check.id} 沒有執行命令。`)
    }
    for (const id of ids) {
      if (!contract.expectedChecks.some(check => check.id === id)) add('UNKNOWN_RUNNER', `未預期的 runner：${id}`)
    }
    for (const rawRef of runner.inputs) {
      const ref = rawRef.replace(/\/$/, '')
      // Runtime and planning artifacts are captured separately and must not hash their own output.
      if (ref === '.governance' || ref.startsWith('.governance/runtime') || ref === 'openspec' || ref.startsWith('openspec/')) {
        add('INVALID_INPUT_SCOPE', `inputs 只能列產品／fixture／runner 輸入，不能包含 runtime 或 openspec：${ref}`)
        continue
      }
      const refs = filesUnder(root, ref)
      if (!refs.length) add('EMPTY_INPUT', `輸入目錄沒有檔案：${ref}`)
      for (const file of refs) material(file, undefined, false)
    }
  }
  catch { add('INVALID_RUNNER_CONFIG', '缺少或無法解析 .governance/runner.json／宣告的輸入。') }

  const { planDigest: _digest, confirmation: _confirmation, execution, humanItems, ...plan } = contract
  // Confirmation/decision metadata is excluded to avoid circular approval digests.
  const planDigest = sha256(canonical({
    contract: {
      ...plan,
      humanItems: humanItems.map(({ status: _status, decisionRef: _ref, ...item }) => item),
      execution: { maxAttempts: execution.maxAttempts, timeoutSeconds: execution.timeoutSeconds },
    },
    files: planFiles,
  }))
  if (contract.planDigest !== planDigest) add('PLAN_DIGEST_MISMATCH', 'planDigest 未設定或計畫已改變。')
  if (contract.confirmation.confirmedPlanDigest !== planDigest) add('CONFIRMATION_STALE', '確認未綁定目前計畫。')
  material(contractRef, undefined, false)
  const candidateDigest = runner ? sha256(canonical({ planDigest, materials, nodeVersion: process.version })) : null
  return { contract, runner, blockers, humanPending, planDigest, candidateDigest, materials, changeRef, runtimeRef }
}
