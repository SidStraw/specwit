# Working on SpecWit

SpecWit connects specifications with observed behavior and verification evidence. The executable package lives in `packages/cli`; the root package contains the documentation website and repository maintenance commands.

| Directory | Commit these files | Keep local |
|---|---|---|
| `packages/cli/` | TypeScript source, bilingual resources, tests, fixtures, package metadata and licenses | `dist/`, `generated/`, dependencies and npm archives |
| `example/` | Teaching changes, OpenSpec/OpenCode configuration, demo source and scripts | `dist/`, `demo-output/` and verification runtime |
| `website/`, `docs/` | Website source, current specification and historical source notes | Root `dist/` |
| `scripts/`, `tests/` | Build/maintenance tools and website regression tests | Logs, coverage, screenshots and security reports under `artifacts/` |

Keep `pnpm-lock.yaml`, OpenSpec schemas, `.governance` templates/contracts, generated OpenCode workflow examples, and migration fixtures in version control. The term governance and historical compatibility fixtures are intentional; do not rename or remove them mechanically.

## Development checks

Use Node.js 22.18+ and the pnpm version in the root package metadata.

```sh
pnpm install --frozen-lockfile
pnpm check:brand
pnpm cli:typecheck
pnpm cli:test
pnpm test
pnpm build
pnpm cli:pack
```

With OpenSpec 1.14.0 installed, run `pnpm --filter @sidtw/specwit test:openspec` and `node example/scripts/check-example.mjs`. `pnpm example:demo` also executes the demonstration and leaves its local evidence under `example/demo-output/` for inspection. These commands do not publish npm packages or deliver project changes.

## Secrets and personal information

Keep real environment files, registry credentials, private keys, authentication state and verification runtime out of Git. Sanitized `.env.example` / `.env.sample` files are allowed; they must contain placeholders, never working credentials. `.gitignore` does not remove files already committed or erase history.

Install [Gitleaks](https://github.com/gitleaks/gitleaks) separately (tested with 8.30.1), or set `GITLEAKS_BIN` to a local executable. Then run:

```sh
pnpm check:secrets
pnpm check:secrets --artifact example/dist/sidtw-specwit-0.3.0.tgz
```

This scans tracked and non-ignored working files, **every local Git blob/commit/tag** (including unreachable objects), and optionally the npm archive. It also checks for personal home paths and identifying commit emails. The scanner uses the default Gitleaks rules, disables inline ignore comments, and uses no findings baseline. It does not upload source files or credentials. Only finding types, locations and counts are kept in `artifacts/security/latest.json`; secret values are never printed by the wrapper.

Ignored local files, installed dependencies, external backups and external copies of the repository are outside that command's default scope. An error, oversized Git object or scanner timeout is an incomplete scan, not a clean result. Rule-based scanning cannot prove the absence of every possible secret; inspect new fixtures and release contents before publishing.

Use a public noreply address or an anonymous `.invalid` address for Git author/committer identity when keeping this repository de-identified. Configure this per repository, not globally. Historical privacy cleanup changes commit IDs; preserve uncommitted work, keep a restricted local backup outside the repository, rewrite affected refs, expire old reflogs and prune unreachable objects, then scan again. Never put the unredacted backup into a public repository or npm archive. If a real credential has escaped, revocation/rotation is separate from removing its text.

Maintainer publication remains explicit. `npm pack` prepares an archive; it does not publish it.
