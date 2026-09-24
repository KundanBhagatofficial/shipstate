# Space Invader benchmark: SHIPSTATE v1.2.0 vs repaired v1.2.1 candidate

Date: 2026-09-24

## Benchmark contract

Both runs used the same locked game baseline commit `34641244d0ba5ffae24657e66d5b777cbef36510` for `KundanBhagatofficial/spaceInvader`. The target was a portrait mobile-first PWA with deterministic Node/static validation; browser E2E was explicitly disabled on the Pi and no physical-device observation is claimed.

## Outcome summary

| Metric | SHIPSTATE v1.2.0 baseline | Repaired 1.2.1 candidate |
| --- | --- | --- |
| Final result | Failed orchestration; no implementation accepted | DELIVERED |
| Accepted tasks | 0 | 8/8 |
| Time to outcome | ~52.8 min to failure | 108.9 min from delivery start to T8 acceptance |
| Full delivery elapsed | n/a | 1067.1 min, including operator/provider pause before finalization |
| Developer runs | 6 (4 Claude, 2 Codex) | 12 governed runs recorded: 2 Claude, 1 Codex, 9 manual/governed fallback records |
| Repair episodes | 4 | 2 |
| Owner decisions | not material to accepted implementation; run failed | 1, resolved |
| Developer-context tokens | ~66k | 139,822 across 12 context builds |
| Manager/diagnostic prompt tokens | ~208k | 48,654 recorded |
| Estimated context tokens avoided | not recorded comparably | 139,000 |
| Final deterministic tests | no accepted implementation | 89/89 game tests; 95/95 SHIPSTATE tests after candidate hardening |
| Journal integrity | run ended before successful delivery | valid, 363 events at final benchmark verification |

The token figures are not strictly like-for-like. The repaired run created context for manually governed fallback tasks after provider quotas were exhausted; the baseline manager-token estimate came from the archived failed run and uses the earlier instrumentation.

## v1.2.0 failure modes exposed by the benchmark

1. Claude could not access developer context because the context artifact lived outside the isolated worktree.
2. Exit 0 with no changes could be misclassified as a successful developer execution even when the provider had refused work.
3. Manager output could invent unsupported or impossible evidence requirements.
4. Rejected tasks could re-enter autonomous selection.
5. Replacement tasks could leave downstream dependencies pointed at the rejected predecessor.
6. `allowedPaths: ["src/core/"]` behaved as an exact path instead of a directory prefix.
7. Scope violations were detected only after an agent finished, wasting execution time.
8. Long-running developer execution had insufficient live telemetry.
9. Provider quota exhaustion interrupted continuity.

## Repairs exercised by the candidate

The candidate branch `shipstate/benchmark-fixes-1.2.1` added worktree-local context, context-tamper detection, provider/context denial classification, rejected-task selection guards, evidence normalization, replacement dependency rewiring, directory-prefix path semantics, and finalization/worktree cleanup hardening.

The directory-prefix repair was discovered during T2: valid descendants such as `src/core/game.js` were initially rejected by the policy engine when the planner supplied `src/core/`. The repaired policy subsequently allowed T2 to pass governed verification and acceptance.

The finalization cleanup hardening was required before project-level completion and is covered by a regression test for already-removed worktrees.

## Repaired-run lifecycle result

The candidate produced an eight-task DAG and ultimately accepted T1 through T8. The final integrated game commit is `020d413d866a0a7606ec027a2b3db5e6f1296ab3`.

`finishProject()` then completed successfully:

- project certification: PASS
- required quality dimensions: accessibility, performance, responsive, security, UI consistency — PASS
- deployment: PASS
- production smoke: PASS
- delivery state: `DELIVERED`
- deployment receipt build hash: `2b7ad6303500c8f70f5ba7307e86df29e4e1e677f868bc46c4ba3fdabbe0d080`
- deployment receipt file count: 19

An independent post-finalization matrix also passed `npm run check`, 89 Node tests, build, all five quality commands, smoke, and `git diff --check`. Journal verification returned valid with 363 checksum-chained events.

## Provider/fallback interpretation

The repaired candidate improved controller correctness but did not prove uninterrupted autonomous provider continuity. Claude completed the initial T1 implementation, then hit session quota. Codex fallback also hit quota. SHIPSTATE correctly stopped at an owner decision instead of looping. The remainder used the supported governed manual/ChatGPT fallback path, preserving task scopes, candidate verification and acceptance boundaries.

Therefore the benchmark demonstrates successful orchestration recovery and deterministic delivery under provider failure, not a fully hands-off eight-task run. A future benchmark should repeat the same locked baseline with restored provider capacity to measure pure autonomous wall time and provider-token cost.

## Release conclusion

The benchmark defects fixed on this branch are release-worthy as v1.2.1 because they correct concrete correctness failures in the existing single-project loop without expanding architecture. The evidence supports prioritizing further v1.3 work around write-time scope enforcement, provider/context sandbox integration, planner schema enforcement, first-class task supersession, quota continuity, streaming telemetry, token efficiency and verification-cost controls before distributed orchestration.

## Remaining evidence boundary

No physical mobile/browser validation was performed on the Pi. Static and simulated adapter checks do not establish real-device touch ergonomics, installability, browser audio behavior, safe-area rendering or measured frame pacing. Those observations remain a separate game-product validation step and are not represented as SHIPSTATE certification evidence.
