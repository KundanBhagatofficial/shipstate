# SHIPSTATE Agent Contract

This file is normative for AI coding agents working in this repository.

## Product boundary

SHIPSTATE is an execution control plane, not an IDE, project manager, architecture visualizer, or game-building product. Keep CodeAtlas-style comprehension and GameForge-specific reconstruction logic outside the core.

## Non-negotiable invariants

1. An agent may produce `IMPLEMENTED`; only deterministic verification may produce `VERIFIED`.
2. A task is executable only when all declared dependencies are `VERIFIED`.
3. Every state transition must be persisted and journaled.
4. Failed attempts must survive process restart and be available to future agents without requiring full transcript replay.
5. The kernel must remain useful without Claude, Codex, cloud accounts, API keys, or paid services.
6. Agent-specific behavior belongs behind adapters. Core state logic must not depend on one model provider.
7. Prefer deterministic local mechanisms over LLM calls for state, dependency resolution, verification, hashing, and policy enforcement.
8. Never silently broaden task scope. Task context is a boundary, not a suggestion.
9. No automatic merge to `main` until an explicit acceptance mechanism and isolation model exist.
10. Add complexity only after the current execution kernel proves it is necessary.

## V1 priorities

1. Execution truth
2. Git/worktree isolation
3. Evidence completeness
4. Failure-loop control
5. Context minimization
6. Cross-agent handoff
7. Thin local observability

## Verification

Run before proposing changes:

```bash
npm test
node src/cli.js doctor
```

New state-machine behavior requires tests. New verification paths require failure-path tests as well as success-path tests.
