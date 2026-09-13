# SHIPSTATE Architecture

## Product boundary

SHIPSTATE is the execution-governance layer between product intent, a Git repository, and coding agents.

```text
Task contract
    |
Context compiler
    |
Execution envelope
    |
Detached Git worktree
    |
Agent / human implementation
    |
Path policy
    |
Deterministic verifier
    |
Evidence + candidate commit
    |
Explicit acceptance
    |
Current branch
```

CodeAtlas may later provide richer semantic context to the context compiler. GameForge may later produce domain-specific task graphs. Neither is required by SHIPSTATE.

## Modules

- `core.js` — lifecycle and DAG eligibility
- `store.js` — atomic materialized state + append-only events
- `spec.js` — Markdown task contracts
- `context.js` — bounded context compiler and lexical discovery
- `git.js` — worktree, diff, candidate commit and acceptance transaction
- `policy.js` — path boundary enforcement
- `agents.js` — replaceable local executable adapters
- `runner.js` — isolated execution orchestration
- `verifier.js` — deterministic evidence production
- `actions.js` — accept/reject/unblock decisions
- `recovery.js` — crash-state reducer
- `server.js` — loopback-only local API and dashboard server
- `web/` — dependency-free operator UI

## State

`.shipstate/state.json` is the current materialized projection. `.shipstate/events.jsonl` is the append-only mutation journal. The directory is local-only and ignored by Git.

State writes use temp-file + rename replacement. Interrupted execution states are repaired by `shipstate recover`.

## Git transaction model

Every run records the starting commit. Work is performed in a detached worktree created from exactly that commit. Verification happens in the same worktree. Successful verification creates a candidate commit. Acceptance checks that the main tree is clean and that its `HEAD` is still the original base before cherry-picking the candidate.

This prevents both main-tree pollution and silent application onto a repository that changed underneath the agent.

## Evidence model

RC evidence types are intentionally small:

- `command` — verification command, exit status and output hash
- `policy` — changed-file path-policy result
- `diff` — final Git diff hash, byte size and summary

More evidence types can be added without changing lifecycle semantics.
