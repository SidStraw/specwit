# SpecWit workflow

SpecWit extends an existing local OpenSpec project. It supplies planning templates and an Observe-mode verifier. It does not grant authorization, isolate code, launch a reviewer, publish results to CI, or finalize Tasks.

## Plan in OpenSpec

Use your installed OpenSpec planning workflow with the `specwit` schema. Read the real project before drafting. Build proposal → specs → behavior-plan → design → verification-contract → tasks. Design is required but can be short. Keep source coverage, implementation decisions, and verification strategy in their respective artifacts instead of duplicating prose.

Use stable requirement IDs, unique across the change, in `### Requirement: ID - Name` headings. Maintain standard OpenSpec delta/scenario syntax. For an existing capability, preserve the full requirement block when modifying it. Do not fabricate behavior requirements for documentation-only changes; select an appropriate lighter schema instead.

Trace every source requirement to a behavior, human item, unresolved question, or explicit exclusion. A behavior should state what can be observed, what counterexample should fail, which existing checks can be reused, the added evidence, and the cost. Distinguish PROGRAMMATIC/PARTIAL/HUMAN_ONLY from readiness. Missing automation stays a gap. A check that covers several scenarios must account for each scenario.

## Bind the actual project

Record entry points, public interfaces, fixtures, startup/readiness, and observation windows appropriate to the project. UI routes and locators are examples, not requirements for API/library/job projects. Mark unavailable facts MISSING or unknown.

Create actual policy, binding, and verifier files; reference their project-relative paths and SHA-256 digests in the verification contract. Review the complete contract against `.governance/contracts/verification-contract.schema.json`. Templates are incomplete drafts and must not be mistaken for runnable or approved contracts.

Copy `.governance/runner.example.json` to `openspec/changes/<change>/runner.json` and replace all placeholders with real checks. Set `execution.runnerRef` to that path. Older contracts without runnerRef use `.governance/runner.json`. Per-change runners avoid unrelated tasks changing one shared runner. Declare all relevant product files, check scripts, fixtures, configuration, and dependency lockfiles in `inputs`; these are explicit files/directories, not globs. Do not include openspec or runtime as product inputs.

Runner commands are argv arrays, executed without a shell. `$NODE` selects SpecWit's Node executable. Each expected check must have exactly one command. A command's stdout must contain one JSON object matching `.governance/contracts/check-output.schema.json`; send logs to stderr. Report actual observations, not a fixed PASS inferred only from exit 0. PASS also requires exit 0. Malformed output, timeout, or unavailable execution is INCONCLUSIVE. Running a command is not sandboxing it.

## Confirm and validate

Run `specwit validate <change> --json`. It checks contract shape, resources, requirement/check coverage, digests, confirmation, and runner readiness without executing checks. It reports the computed `planDigest` even when an otherwise well-formed contract is blocked. Set that value in the contract. After a real, applicable confirmation, record `confirmation.sourceRef`, `status: CONFIRMED`, and the same `confirmedPlanDigest`. Never invent confirmation, identities, hashes, or test results. Existing valid authorization does not require repeated approval merely because a session changed.

`specwit validate` is SpecWit's content/preflight validation; it does not replace OpenSpec's delta-spec validation. Use both when reviewing planning artifacts. READY is readiness for Observe execution, not trusted authorization or Task completion. Human items can remain pending at this stage and are listed separately.

## Implement, verify, and review

Run an appropriate baseline before changes, distinguishing pre-existing failures, new behavior not yet implemented, and environmental failures. Implement the scoped work with useful checks and documentation in the corresponding functional tasks.

Run `specwit verify <change> --json` to create a new Run and execute checks. Use `specwit status <change> --json` to reassess current evidence after edits. New, modified, or deleted declared inputs can make prior evidence STALE even when the Git commit is unchanged. Changed plan inputs require re-evaluating confirmation. Keep failed Runs and review attempts rather than replacing them with a success claim.

When `review.required` is true, use `.governance/prompts/review.md` with an independently obtained review. SpecWit does not launch or isolate a model. Import the response in an envelope using `specwit verify <change> --run <run-id> --review <project-relative.json>`. Take run IDs and digests from the real report, not a model guess. Criteria must be covered exactly once. Evidence IDs currently reference `check:<id>` observations from the same Run. Confidence is self-reported and cannot override a failing check. Resolve explicit human items with actual decision sources.

PASS is possible only for current necessary results and resolved required review/human items. Missing, unknown, INCONCLUSIVE, STALE, or INVALID evidence cannot establish acceptance. All reports remain `assurance: Observe` and `eligible: false`; before/after hashes are not immutable snapshots and local records can be modified by the same user.

## Deliver and explicitly complete

A Task, a Run, an agent session, and a process have separate lifecycles. Deliver only within existing authorization. Preserve shipped code, tests, and main specs; synchronize needed spec deltas before checking the final delivered version. CompletionTarget CI requires a fresh Run for the actual CI version and a separate explicit completion step; a local PASS does not complete it. SpecWit does not install a CI workflow or publisher.

`specwit complete <change> --dry-run` previews task-owned paths only. Actual finalization and cleanup are not implemented and remain BLOCKED_EXTERNAL. Do not check the completion task, delete resources, or claim the Task is completed merely because a preview, test, or session ended. Archive retains change files and is not a finalizer. The target cleanup policy removes only task-owned data after explicit completion, preserving product artifacts, shared rules, other tasks, and existing user sessions. Revalidating a final Git version after cleanup and cleaning offline copies still need an external lifecycle design.

## Maintain this installation

`specwit init --language en` or `specwit init --language zh-TW` refreshes unmodified managed resources and preserves existing change artifacts and OpenSpec-generated skills. Omit language to retain the installed language in non-interactive use. Local edits to managed files cause a conflict instead of being overwritten. Back up and reconcile them before updating. The previous default schema and installed resource hashes are in `.governance/config.json`; they are installation metadata, not approval evidence. Runtime data is gitignored.
