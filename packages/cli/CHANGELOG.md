# Changelog

## 0.3.0 — SpecWit

- Rename the project to SpecWit (short for SpecWitness), npm package to `@sidtw/specwit`, CLI to `specwit`, and bundle to `dist/specwit.mjs`.
- Update English and Taiwan Traditional Chinese resources, documentation, examples, website and package installation tests.
- Use `specwit` as the new OpenSpec schema. Read existing installation manifests and retain managed legacy schema aliases while refreshing their command instructions safely.
- Preserve `.governance/` paths, contract structure, existing changes, Run records, digest calculations and verdict rules. New `SPECWIT_*` runner variables coexist with the legacy aliases.
- Keep the OpenSpec initialization prerequisite, English default, language selection and Observe-only limitations. No publishing or finalization is added.
- See [migration details](MIGRATION.md) ([繁體中文](MIGRATION.zh-TW.md)) for conflicts, renamed setup error codes and upgrading existing projects.

## 0.2.0 — historical GOV release


- Add `gov init` with a completed local OpenSpec prerequisite, version/root discovery, persisted project binding, and English / Taiwan Traditional Chinese selection.
- Bundle generic schema `gov`, six planning templates, workflow instructions, reviewer prompts, and JSON Schemas. English is the default; runtime diagnostics and error codes are English.
- Merge existing OpenSpec configuration and ignore rules; preserve active changes and generated agent workflows. Reinitialization is idempotent and refuses to overwrite local edits.
- Make `gov validate` the primary read-only preflight command; retain `gov check` as an alias. All project CLI commands now require `gov init`.
- Support `execution.runnerRef` for per-change runner configuration, with the original shared `.governance/runner.json` fallback.
- Prepare a publishable npm package with bundled runtime dependencies, no workspace catalog requirement, standalone resources/tests, and license notices. No registry publication is performed.

### Migration from 0.1.0

Run `gov init --language zh-TW` to retain Chinese planning in an existing project, or use `--language en`. Existing changes keep their schema and content; the new default is `gov`. Existing `governed-delivery` schemas and `0.1-example` contracts remain readable. The new tool reads existing Run records and does not rewrite them. `check` remains available, but now requires initialization like validate, verify, status, and complete. Parsing consumers should use issue codes rather than translated human messages.

Init will refuse to replace unrelated `openspec/schemas/gov` or `.governance` managed files. Back up and reconcile conflicts; no force flag bypasses them. Contract confirmation and evidence must still match their actual plan and inputs. Complete remains a read-only preview requiring an external finalizer; this release does not add protected acceptance or cleanup.
