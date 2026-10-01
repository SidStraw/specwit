# Migrating to SpecWit 0.3.0

[繁體中文](MIGRATION.zh-TW.md)

SpecWit replaces the former GOV brand. The npm package changes from `@gov/cli` to `@sidtw/specwit`, the executable from `gov` to `specwit`, and the bundle from `dist/gov.mjs` to `dist/specwit.mjs`. The package exposes only the new executable. Update npm scripts, CI commands and agent launch commands that invoke the old executable. Publishing remains a maintainer action.

```sh
npm install -g @sidtw/specwit
cd /path/to/project
specwit init
# Or explicitly select Taiwan Traditional Chinese:
specwit init --language zh-TW
specwit validate <change>
specwit verify <change>
specwit status <change>
```

OpenSpec must already be initialized in the exact project. An existing usable OpenSpec setup does not need to be recreated for this rename. Back up or commit project configuration before upgrading so you can review the changes. If you installed the old package locally, replace that dependency in your project; installing the new package does not uninstall the old one.

## What changes

| Item | Migration |
|---|---|
| New project schema | `specwit`, under `openspec/schemas/specwit/` |
| Existing `gov` schema | Retained as a compatibility schema when recorded in the old installation manifest. Unmodified managed templates and instructions are refreshed to use `specwit` commands; the registered schema name stays `gov`. |
| Existing changes | Their `.openspec.yaml`, proposals, specs, contracts and tasks are never rewritten by init. Existing `gov` and custom `governed-delivery` changes keep their schema. |
| `.governance/` | Unchanged. This is a governance data directory, not a brand-specific rename target. Contracts, runner references, runtime paths and cleanup ownership remain valid. |
| `.governance/config.json` | The same manifest path and `schemaVersion: 1` remain. `schema` becomes `specwit`, `toolVersion` becomes `0.3.0`, resource hashes are updated, and `previousSchema` retains the original pre-installation default. No new approval fields are introduced. |
| OpenSpec project config | Default schema becomes `specwit`. The exact owned `gov:context` block is replaced with `specwit:context`; exact owned operation guidance is refreshed. Other context, rules, comments and guidance remain. |
| Runner environment | New scripts use `SPECWIT_TASK_ID`, `SPECWIT_RUN_ID`, `SPECWIT_CHECK_ID`. Existing `GOV_TASK_ID`, `GOV_RUN_ID`, `GOV_CHECK_ID` remain aliases with the same values. |
| Machine errors | `GOV_NOT_INITIALIZED` becomes `SPECWIT_NOT_INITIALIZED`; `INCOMPLETE_GOV_SETUP` becomes `INCOMPLETE_SPECWIT_SETUP`. Verification issue codes, verdicts, exit meanings and evidence rules are otherwise unchanged. |

The new CLI can read a valid 0.2.0 installation and existing Run records even before migration. Init installs the new default schema and current instructions. It does not move, delete, regenerate or reapprove existing Runs, confirmations, source material, or product files. The old 0.1.0 CLI had no installation manifest: complete OpenSpec setup and run `specwit init`; its custom schemas and changes are preserved.

## Conflicts and verification

Init checks managed-file hashes and the exact owned context/guidance before writing. Modified legacy templates, locally customized prompts, duplicate/mixed context markers, and conflicting new schema files produce a conflict without partial migration. There is no force flag. Back up and reconcile the reported differences, then retry. A `gov` directory not owned by the old manifest is left untouched. Custom schemas with old command instructions need a deliberate manual update to `specwit`.

Rerunning init is idempotent. Language selection still defaults to English on first installation; non-interactive upgrades without `--language` keep the saved language. Interactive init offers the saved language as its default. Retained managed compatibility templates follow later language changes; existing change documents do not.

The verdict algorithm and digest rules are unchanged. Existing evidence remains usable when its recorded inputs still match. If your contract explicitly hashes a managed prompt or template refreshed during migration, its changed bytes correctly make the old evidence stale; review the change and obtain fresh confirmation/evidence through the existing workflow. Do not edit stored digests or Run records to conceal that change.

Observe remains Observe (`eligible: false`). `validate` does not execute tests; `verify` runs configured checks; `complete` only previews cleanup and remains `BLOCKED_EXTERNAL`. The rename adds no isolation, authenticated approval, automatic reviewer, CI publisher or finalizer.

## Intentional historical names

Old names remain only where compatibility or historical traceability requires them: this migration guide, release history, compatibility constants/environment aliases, frozen migration fixtures/tests, original source notes and the source-map row that cites their historical title. Generated demo Runs are historical evidence and are not rewritten. New builds and npm tarballs use only `specwit` as their executable name.
