# SpecWit

[繁體中文](README.zh-TW.md)

SpecWit, short for SpecWitness, connects specifications with observed behavior and verification evidence, while making remaining unknowns explicit.

SpecWit is an npm-installable companion to OpenSpec. `specwit init` binds an already initialized **local** OpenSpec project, installs an evidence-oriented workflow, and merges project guidance. `specwit validate` checks verification contracts; `specwit verify` executes declared checks; `specwit status` reassesses evidence for the current inputs.

**Current assurance: Observe.** All verification reports include `eligible: false`. SpecWit does not authenticate approvers, isolate the runner, freeze immutable candidates, launch reviewers, publish CI gates, or delete/finalize Tasks.

## Install and initialize

Requires Node.js **22.18+** and OpenSpec **>=1.14.0 <2.0.0**; integration is tested with OpenSpec **1.14.0**. Newer 1.x versions within that range still need compatibility testing. OpenSpec is installed separately. SpecWit never runs `openspec init` for you.

The npm package is `@sidtw/specwit`; its executable is `specwit`. Registry publication is performed separately by the maintainer. After publication:

```sh
npm install -g @sidtw/specwit

# In your project, first complete OpenSpec setup if needed:
openspec init
specwit init                         # interactive language selection, English default
specwit init --language zh-TW        # choose Taiwan Traditional Chinese

# After planning the change and configuring its real verification inputs:
specwit validate <change>
specwit verify <change>
specwit status <change>
```

For an unpublished build, run `npm install`, `npm run typecheck`, `npm test` and `npm pack` from this package directory, then install the resulting tarball with `npm install -g /absolute/path/to/sidtw-specwit-0.3.0.tgz`. No initialization, test, or pack command publishes to npm.

Use `specwit init --language en` for non-interactive English. Init accepts a positional project or `--root`, and `--json` suppresses prompts. See [migration notes](MIGRATION.md) before upgrading an existing installation.

Init requires `openspec/config.yaml` with a schema and the `openspec/specs` and `openspec/changes` directories. It also reads `openspec --version` and `openspec list --json` to confirm the exact planning root. An empty directory, a parent project's root, unsupported version, or external store is rejected before writes. These checks establish usable setup, not a historical receipt proving who ran init. A checked-out project missing empty directories should rerun OpenSpec's init.

A project-local OpenSpec npm installation is preferred when resolvable; otherwise SpecWit uses `openspec` on PATH. `OPENSPEC_BIN` can name one executable or its `.js`/`.mjs` entry point (not a shell command with arguments). On Windows, use a local OpenSpec npm installation or its JS entry point if a global `.cmd` shim cannot be spawned. Automated installation testing currently runs on macOS; Windows process cleanup remains limited.

## What init installs

```text
openspec/schemas/specwit/schema.yaml
openspec/schemas/specwit/templates/      six planning templates
.governance/config.json             language, compatibility and managed-file metadata
.governance/workflow.md              localized workflow instructions
.governance/prompts/review.md        localized independent-review prompt
.governance/contracts/               contract / runner / check / review JSON Schemas
.governance/runner.example.json      placeholder example, never executed automatically
```

It changes the default OpenSpec schema to `specwit`, merges a delimited context block plus apply/archive guidance, and appends `.governance/runtime/` to `.gitignore`. Existing context, rules, operation guidance, comments, other config fields, agent skills, and active changes are preserved. It does not write product files or modify AGENTS.md. Existing changes retain their schema; migrate them deliberately rather than assuming changing the default migrated them.

English is the default language for templates, schema instructions, workflow guidance, and review prompts. `zh-TW` localizes all of these while retaining machine keys, IDs and OpenSpec headings. CLI help, diagnostics and machine error codes remain English; init's completion notes follow the selected language. The selected language is persisted. In non-interactive mode an omitted language preserves an existing installation's language; `--json` never prompts.

Rerunning init is idempotent. Changing language or refreshing resources replaces only unchanged SpecWit-managed files, not existing change artifacts. Local edits and conflicting unowned files are rejected before the write phase; no `--force` overwrites them. Back up and reconcile edits before refreshing. Keep custom rules outside the managed context block and operation entries. Changing templates affects subsequent planning even for an existing change, so review ongoing work before upgrading. The previous default schema is recorded in `.governance/config.json`; it is not restored automatically.

## Commands

All project commands require `specwit init`. `--root` defaults to the current directory and does not search parents. References inside contracts and `--review` are relative to that root.

| Command | Purpose | Writes |
|---|---|---|
| `specwit init [project] [--language en\|zh-TW]` | Validate the OpenSpec prerequisite and install/merge resources | Managed setup files |
| `specwit validate <change>` | Validate the contract, resource hashes, requirement/check coverage, confirmation and runner readiness | None |
| `specwit check <change>` | Compatibility alias for validate | None |
| `specwit verify <change>` | Preflight, then create a new Run and execute each declared check | Task runtime |
| `specwit verify <change> --run <uuid> --review review.json` | Validate/import an external reviewer envelope | A new review attempt |
| `specwit status <change> [--run <uuid>]` | Reassess current inputs against a specified/latest Run | None |
| `specwit complete <change> --dry-run` | Preview task-owned cleanup and report the missing external finalizer | None |

All support `--json`; init also accepts `--root` instead of a positional project. `--help` and `--version` need no project. Unknown, duplicate value, missing-value, and incompatible options fail with structured error codes. `complete` never deletes data, even when `--dry-run` is omitted.

| Exit | Meaning |
|---|---|
| 0 | Initialization succeeded/unchanged, preflight READY, or Observe PASS |
| 1 | A required check explicitly failed |
| 2 | Blocked, not run, stale, inconclusive, or external work required |
| 3 | Usage, data, IO, lock, or attempt-limit error |

`specwit validate` is content/preflight validation, not a substitute for OpenSpec's spec-format validator and not test execution. A freshly generated contract is intentionally incomplete and will fail or block until real values are supplied. READY may list pending human items; verify/status require their acceptance decisions before PASS. Initialization success and exit 0 are never proof of product acceptance.

## Use in a real project

1. Plan a change with your existing OpenSpec agent workflow using schema `specwit`. It creates proposal, specs, behavior-plan, design, verification-contract and tasks. Keep unique requirement IDs in `### Requirement: R01 - Name` headings.
2. Inspect the real implementation and existing tests. Bind behaviors to project entry points, interfaces, fixtures and observation windows. Reuse meaningful checks before adding new ones. Templates support UI, API, library and job projects.
3. Complete the contract and actual policy/binding/verifier files with real SHA-256 values. Schema version `0.1` is current; `0.1-example` remains readable for legacy examples. Only Observe executes.
4. Copy the installed runner example to `openspec/changes/<change>/runner.json`, replace placeholders, and set `execution.runnerRef`. Contracts omitting runnerRef retain `.governance/runner.json` compatibility. Per-change runners avoid coupling unrelated tasks.
5. Run `specwit validate <change> --json`. With a well-formed contract it computes planDigest even when confirmation is pending. Record the digest, obtain applicable human confirmation, then reference that source and the same confirmedPlanDigest. SpecWit does not manufacture approval.
6. Run `specwit verify <change>`, import review when required, and use `specwit status <change>` after edits. Relevant changes invalidate previous evidence. Follow the installed workflow for CI, delivery and completion limitations.

A runner looks like this; all paths and commands must exist in your actual project:

```json
{
  "schemaVersion": 1,
  "inputs": ["src", "tests", "scripts/specwit-check.mjs", "package.json", "package-lock.json"],
  "checks": [{ "id": "B01", "command": ["$NODE", "scripts/specwit-check.mjs"] }]
}
```

Checks run without a shell in the project directory and inherit the environment plus SPECWIT_TASK_ID, SPECWIT_RUN_ID, and SPECWIT_CHECK_ID. `$NODE` uses the current Node executable. Each command prints exactly one JSON object on stdout; diagnostics go to stderr:

```json
{
  "schemaVersion": 1,
  "checkId": "B01",
  "verdict": "FAIL",
  "observations": ["The operation emitted two requests; the requirement permits one."]
}
```

Use PASS, FAIL, or INCONCLUSIVE with nonempty observations. PASS requires exit 0. A timeout, malformed report, wrong ID, unavailable executable or conflicting exit status is INCONCLUSIVE. Combined stdout/stderr is limited to 256 KiB; raw stderr is not retained. `execution.timeoutSeconds` is per check (1–3600), and maxAttempts is the cumulative Task Run limit (1–100); no automatic retries or implicit reset after a plan edit.

## Review, evidence, and lifecycle

The installed review prompt describes a response containing assessments for the contract's exact criteria. Each criterion appears once. Unknown requires confidence null; other verdicts require confidence 0–1 and evidence IDs. Currently only `check:<id>` observations from the same Run are accepted. Images, arbitrary files and trace attachments are not supported.

Wrap the response using exact identifiers from the real Run:

```text
{ schemaVersion: 1, taskId, runId, planDigest, candidateDigest, response }
```

The installed review-envelope schema defines its JSON shape. Import through verify with both --run and --review. Invalid imports are retained as attempts; an invalid latest attempt cannot fall back to a previous valid review. Review does not override a failed required check. PARTIAL conditions must explicitly describe remaining human work in humanItems.

Runtime lives under `.governance/runtime/<task>/<run-id>/run.json`, with latest.json and a task lock. Cancellation retains an interrupted Run. POSIX termination attempts to kill the process group; Windows terminates only the direct child. Neither is complete isolation. Check abandoned processes before manually removing a stale lock.

planDigest binds planning files, source material, policy/binding/verifier, review schema, and runner configuration. Confirmation/decision status and task checkboxes are excluded to avoid circular approval hashes. candidateDigest also binds the raw contract, decision sources, declared product inputs and Node version. Per-file limit is 16 MiB, input limit is 10,000 files, and JSON/Run limit is 1 MiB. Symlinks, paths escaping the project and runtime inputs are rejected; .git and node_modules are excluded from directory walks.

Input declarations may be incomplete, before/after hashes cannot detect modify-then-restore during execution, and local records remain writable by the user. Trusted approval, protected execution/results, immutable snapshots, reviewer launch, CI publisher, and finalization/cleanup require external capabilities. `specwit complete` stays BLOCKED_EXTERNAL and never deletes. Archive is not completion. These limitations are explicit in both languages.

## Development and release preparation

This package directory is self-contained: source, localized resources, fixtures and tests do not require the parent SpecWit website or example directory. Runtime dependencies and resources are bundled into one executable. Build/test use ordinary npm scripts; the parent workspace may also invoke them with pnpm. Only dist, README/migration/changelog documentation and license/notice files are shipped.

```sh
npm install
npm run typecheck
npm test
npm run test:openspec  # requires the real OpenSpec 1.14.0 executable
npm pack
```

Tests cover prerequisite refusal, configuration preservation, language switching, conflicts, actual subprocess results, review/staleness, legacy migration and offline installation of the npm tarball through the installed `specwit` executable. The tarball test uses a discovery stub. `test:openspec` separately runs both languages against real OpenSpec 1.14.0 in temporary projects: init, schema validation, all six artifact instructions, operation guidance, legacy validation, schema migration and idempotence. It leaves your current project untouched. See MIGRATION.md for upgrade instructions and CHANGELOG.md for release history. Publishing is a separate maintainer action.

MIT licensed. OpenSpec-derived workflow attribution is in NOTICE; bundled dependency licenses are in dist/THIRD_PARTY_NOTICES.txt.
