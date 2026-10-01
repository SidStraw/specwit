# Tasks

## 1. Confirm and prepare

- [ ] 1.1 Check the behavior plan, version, confirmation source, and operation permissions; cite the actual source without inventing approval.
- [ ] 1.2 Bind the plan to the real project, existing checks, verifier, and bounded runner; use specwit validate <change> to identify remaining gaps.
- [ ] 1.3 Run the applicable baseline; distinguish existing failures, missing new behavior, and environment failures.

## 2. Implement with meaningful checks

- [ ] 2.1 Implement the specified behaviors, with relevant tests and documentation in each functional task; record behavior IDs and observed results. Split this task for larger changes.

## 3. Verify candidate

- [ ] 3.1 Identify the actual candidate and all declared inputs; record digests and limitations. If protected freezing is required but unavailable, report BLOCKED_EXTERNAL.
- [ ] 3.2 Run specwit verify <change>; account for every expected check, scenario, and attempt. Missing, inconclusive, stale, or invalid evidence is not PASS.
- [ ] 3.3 When review.required is true, obtain an independent structured review and import its envelope for the same Run; resolve human items and blocking findings. Otherwise document why review is not required.

## 4. Deliver and explicitly complete

- [ ] 4.1 Deliver the verified version within existing authorization; synchronize delivered specs. For CI completion, retain the contract for a fresh CI Run against the actual final version.
- [ ] 4.2 Use specwit complete <change> --dry-run to inspect task-owned cleanup. Explicit completion and deletion require an external finalizer; keep this task open and report BLOCKED_EXTERNAL when unavailable. Archive is not a substitute.
