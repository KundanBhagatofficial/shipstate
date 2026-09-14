# SHIPSTATE 1.0 Architecture

```text
Repository + product docs
        |
 Project Intelligence
        |
 proposed plan -> human approval
        |
 Task DAG + Design Locks
        |
 Context Engine 2
        |
 Execution Envelope
        |
 OS sandbox + detached Git worktree
        |
 Agent / human / remote worker
        |
 Path policy + Design Locks
        |
 Evidence Engine 2
        |
 Verified candidate commit
        |
 explicit / policy acceptance
        |
 integrated branch
```

## Project Intelligence
`profile.js` detects Node, Python, Rust, Go, Java/Kotlin, Swift and Flutter/Dart repositories, package managers, frameworks, manifests, source/test directories, CI and commands.

## State
`state.json` is the materialized projection. `state.prev.json` is the last-good snapshot. `events.jsonl` is a SHA-256 hash chain. Legacy journals are upgraded automatically with a backup. New-format journals contain sufficient task/run/evidence/decision/plan payloads for state replay.

## Context Engine 2
The engine builds a lightweight local index: files, symbols, imports, reverse imports, adjacent tests and Git history. It uses explicit task files first, then bounded lexical/dependency expansion. No embedding service is required.

## Runtime
`runner.js` creates a detached worktree from an exact base. `sandbox.js` chooses the strongest locally available isolation. `runtime.js` streams output, records logs, enforces timeouts and supports cancellation/process-tree termination.

## Evidence
Evidence is typed: `test`, `lint`, `typecheck`, `security`, `coverage`, `performance`, `browser`, `command`, `policy`, `diff`, `sandbox`. Task contracts can require evidence classes.

## Scheduler
Independent task batches are selected only when declared path scopes do not overlap. Parallel verified candidates are not auto-integrated after another candidate moves HEAD; the stale-base invariant wins over throughput.

## Product Owner
`planner.js` converts document sections into proposed tasks. Proposals do not enter project truth until explicit `plan approve`.

## External boundaries
- GitHub: optional `gh` adapter.
- CodeAtlas: optional context-provider contract stored under `.shipstate/integrations/`.
- GameForge: optional task/workflow-provider contract stored under `.shipstate/integrations/`.
- Remote runners: SSH capability layer; no hosted runner is required.
