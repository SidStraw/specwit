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
      if (expected !== undefined && expected !== digest) add('DIGEST_MISMATCH', `File digest is missing or mismatched: ${ref}`)
    }
    catch { add('MISSING_OR_UNSAFE_FILE', `File is missing, unsupported, or unsafe: ${ref}`) }
  }
  if (contract.taskId !== taskId) add('TASK_MISMATCH', 'contract.taskId does not match the change name.')
  if (contract.profile !== 'Observe') add('UNSUPPORTED_PROFILE', 'This version supports Observe only.')
  for (const name of ['proposal.md', 'behavior-plan.md', 'design.md']) material(`${changeRef}/${name}`)
  if (!hasFile(root, `${changeRef}/tasks.md`)) add('MISSING_TASKS', 'Missing tasks.md.')
  const requirements: string[] = []
  try {
    const specs = filesUnder(root, `${changeRef}/specs`).filter(ref => ref.endsWith('.md'))
    if (!specs.length) add('MISSING_SPECS', 'No spec files found.')
    for (const ref of specs) {
      material(ref)
      for (const match of readText(root, ref).matchAll(/^### Requirement:\s*(.+)$/gm)) {
        const id = /^([A-Za-z][\w.-]*)\s+-\s+/.exec(match[1])?.[1]
        if (id) requirements.push(id)
        else add('REQUIREMENT_ID_MISSING', `Requirement heading needs a stable ID (ID - Name): ${ref}`)
      }
    }
    if (!requirements.length) add('NO_REQUIREMENTS', 'No requirement IDs found.')
  }
  catch { add('MISSING_SPECS', 'Cannot read a safe specs directory.') }
  for (const [label, values] of [
    ['requirement', requirements],
    ['source', contract.sources.map(item => item.id)],
    ['check', contract.expectedChecks.map(item => item.id)],
    ['criterion', contract.review.criteria.map(item => item.id)],
    ['human item', contract.humanItems.map(item => item.id)],
  ] as const) {
    for (const id of duplicates([...values])) add('DUPLICATE_ID', `Duplicate ${label} ID: ${id}`)
  }
  const coverage = new Set<string>()
  for (const check of contract.expectedChecks) {
    if (check.readiness !== 'READY') add('CHECK_NOT_READY', `${check.id}：${check.readiness}`)
    for (const id of check.requirementIds) {
      if (!requirements.includes(id)) add('UNKNOWN_REQUIREMENT', `${check.id} references an unknown requirement: ${id}`)
      coverage.add(id)
    }
  }
  for (const item of contract.humanItems) {
    for (const id of item.requirementIds ?? []) {
      if (!requirements.includes(id)) add('UNKNOWN_REQUIREMENT', `${item.id} references an unknown requirement: ${id}`)
      coverage.add(id)
    }
    if (item.status !== 'ACCEPTED' || !item.decisionRef)
      humanPending.push({ code: 'HUMAN_ITEM_PENDING', message: `${item.id} has no acceptance decision.` })
    if (item.decisionRef) material(item.decisionRef, undefined, false)
  }
  for (const id of requirements) {
    if (!coverage.has(id)) add('UNCOVERED_REQUIREMENT', `Requirement has no check or human item: ${id}`)
  }
  for (const source of contract.sources) material(source.ref, source.sha256)
  for (const name of ['policy', 'binding', 'verifier'] as const) {
    const resource = contract[name]
    if ('status' in resource && resource.status !== 'READY') add('RESOURCE_NOT_READY', `${name} is not READY.`)
    if (!resource.ref) add('MISSING_RESOURCE', `${name}.ref is missing.`)
    else material(resource.ref, resource.digest)
  }
  material(contract.review.schemaRef)
  try {
    new Ajv2020({ strict: true, allErrors: true }).compile(readJson(root, contract.review.schemaRef) as object)
  }
  catch { add('INVALID_REVIEW_SCHEMA', 'Review JSON Schema is invalid or unreadable.') }
  if (contract.review.required && !contract.review.criteria.length) add('MISSING_CRITERIA', 'Required review has no criteria.')
  if (!contract.execution.maxAttempts || !contract.execution.timeoutSeconds) add('MISSING_LIMITS', 'Set maxAttempts and timeoutSeconds.')
  if (contract.confirmation.status !== 'CONFIRMED') add('CONFIRMATION_PENDING', 'Plan confirmation has not been recorded.')
  if (!contract.confirmation.sourceRef) add('MISSING_CONFIRMATION_SOURCE', 'Missing a verifiable confirmation source.')
  else material(contract.confirmation.sourceRef, undefined, false)

  let runner: Runner | null = null
  const runnerRef = contract.execution.runnerRef ?? '.governance/runner.json'
  try {
    runner = parse(runnerSchema, readJson(root, runnerRef), runnerRef)
    material(runnerRef)
    for (const id of duplicates(runner.checks.map(item => item.id))) add('DUPLICATE_RUNNER', `Duplicate runner check: ${id}`)
    const ids = runner.checks.map(item => item.id)
    for (const check of contract.expectedChecks) {
      if (!ids.includes(check.id)) add('MISSING_RUNNER', `${check.id} has no runner command.`)
    }
    for (const id of ids) {
      if (!contract.expectedChecks.some(check => check.id === id)) add('UNKNOWN_RUNNER', `Unexpected runner check: ${id}`)
    }
    for (const rawRef of runner.inputs) {
      const ref = rawRef.replace(/\/$/, '')
      // Runtime and planning artifacts are captured separately and must not hash their own output.
      if (ref === '.governance' || ref.startsWith('.governance/runtime') || ref === 'openspec' || ref.startsWith('openspec/')) {
        add('INVALID_INPUT_SCOPE', `Inputs must reference product, fixture, or check files, not runtime or openspec: ${ref}`)
        continue
      }
      const refs = filesUnder(root, ref)
      if (!refs.length) add('EMPTY_INPUT', `Input directory is empty: ${ref}`)
      for (const file of refs) material(file, undefined, false)
    }
  }
  catch { add('INVALID_RUNNER_CONFIG', `Cannot read or parse ${runnerRef} or its declared inputs.`) }

  const { planDigest: _digest, confirmation: _confirmation, execution, humanItems, ...plan } = contract
  // Confirmation/decision metadata is excluded to avoid circular approval digests.
  const planDigest = sha256(canonical({
    contract: {
      ...plan,
      humanItems: humanItems.map(({ status: _status, decisionRef: _ref, ...item }) => item),
      execution: { maxAttempts: execution.maxAttempts, timeoutSeconds: execution.timeoutSeconds, ...(execution.runnerRef ? { runnerRef: execution.runnerRef } : {}) },
    },
    files: planFiles,
  }))
  if (contract.planDigest !== planDigest) add('PLAN_DIGEST_MISMATCH', 'planDigest is missing or the plan has changed.')
  if (contract.confirmation.confirmedPlanDigest !== planDigest) add('CONFIRMATION_STALE', 'Confirmation is not bound to the current plan.')
  material(contractRef, undefined, false)
  const candidateDigest = runner ? sha256(canonical({ planDigest, materials, nodeVersion: process.version })) : null
  return { contract, runner, blockers, humanPending, planDigest, candidateDigest, materials, changeRef, runtimeRef }
}
