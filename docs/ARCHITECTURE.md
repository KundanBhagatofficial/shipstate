# SHIPSTATE 1.1 Architecture

SHIPSTATE has two nested state machines: a **project delivery lifecycle** owned by SHIPSTATE and the existing **task lifecycle** used for bounded implementation work.

```text
Project Owner
  |
  | canonical project pack + delegated authority
  v
Project Handover Gate
  |
  | deterministic completeness / decision / Git checks
  v
Codex Project Manager
  |
  | structured JSON roadmap + bounded task contract
  v
SHIPSTATE Task DAG / Context Engine
  |
  v
Claude Developer
  |
  | detached Git worktree + sandbox
  v
SHIPSTATE Verification / Evidence
  |
  v
Codex Senior Reviewer
  |        |          |
APPROVE   REPAIR     REPLAN / OWNER GATE
  |        |          |
  v        +-> Claude +-> Codex / Owner
SHIPSTATE acceptance
  |
  v
next eligible task
  |
  v
Codex completion review
  |
  v
SHIPSTATE project certification
  |
  v
optional authorized deployment + smoke + rollback
  |
  v
DELIVERED
```

## Canonical project truth

`project-kit.js` creates the uniform handover surface under `docs/shipstate/` plus `shipstate.project.json`. Product, feature, UX, frontend, architecture, data, security, development, testing, deployment, acceptance and decision-ledger documents are mandatory. Template TODO markers, missing substantive content, unresolved mandatory decisions or a dirty Git tree block handover.

`shipstate.project.json` is the machine-readable authority contract. It assigns AI roles, autonomy boundaries, repair/task limits, delivery commands and explicit owner decisions. After `handover accept`, SHIPSTATE stores a hash of the complete project contract. Any later edit to the approved documents/config invalidates autonomous execution until the owner audits and accepts again.

The control files are protected paths for implementation agents:

- `shipstate.project.json`
- `docs/shipstate/**`
- `.shipstate/**`
- `.git/**`
- `.env*`

## Project lifecycle

```text
PROJECT_SETUP
  -> HANDOVER_REVIEW
  -> READY_FOR_HANDOVER
  -> AUTONOMOUS_DEVELOPMENT
  -> INTERNAL_CERTIFICATION
  -> RELEASE_CANDIDATE
  -> DEPLOYMENT (when authorized/configured)
  -> DELIVERY_VALIDATION
  -> DELIVERY_READY
  -> DELIVERED
```

Exception states are `OWNER_DECISION_REQUIRED`, `PAUSED`, `BLOCKED`, and `FAILED_CERTIFICATION`.

Owner gates are explicit state objects, not chat messages. A resolution can authorize one specific release/deployment gate, request a replan, retry the affected path, or pause delivery. Routine implementation choices stay delegated.

## AI team boundary

`agent-team.js` provides role-specific manager/reviewer execution. Codex receives structured project truth and must emit a validated JSON contract. Its role output is advisory orchestration input; it cannot directly mark work VERIFIED, ACCEPTED or DELIVERED.

- **Project-manager preflight** checks material ambiguity/contradiction once per unchanged accepted handover.
- **Project-manager plan** generates or extends a bounded dependency DAG.
- **Project-manager task brief** produces the exact developer brief for one eligible task.
- **Code reviewer** evaluates the verified candidate and may APPROVE, REPAIR, REPLAN or request an owner decision.
- **Completion reviewer** checks whether approved scope is actually complete or whether more in-scope tasks are required.

Recurring manager/reviewer calls use compact project projections and task-related documents rather than repeatedly sending the entire project pack. Prompt-token estimates are journaled for analytics.

## Project Intelligence

`profile.js` detects Node, Python, Rust, Go, Java/Kotlin, Swift and Flutter/Dart repositories, package managers, frameworks, manifests, source/test directories, CI and commands. The project profile is refreshed again before final certification so build/test scripts created during development are included.

## Context Engine 2

`context.js` builds a lightweight local index of files, symbols, imports, reverse imports, adjacent tests and Git history. Developer context additionally contains the Codex manager brief, review/repair findings, acceptance criteria, Design Locks and relevant previous attempts. No embedding service is required.

## Runtime and Git transaction

`runner.js` creates a detached worktree from the exact current base commit. `sandbox.js` chooses the strongest locally available isolation. `runtime.js` streams output, records logs, enforces timeouts and supports process-tree termination.

Claude changes only its worktree. Verification runs there, then creates a candidate commit. Codex review happens after deterministic verification. Only SHIPSTATE acceptance cherry-picks the candidate into the governed branch, and only if the branch is still clean and at the recorded base commit.

## Evidence and delivery

Task evidence includes typed test/lint/typecheck/security/coverage/performance/browser/command evidence plus path policy, diff and sandbox evidence. Final project certification requires all tasks ACCEPTED and at least one deterministic project certification command detected/configured.

Configured deployment is also evidence-producing. Automatic or owner-approved deployment can run deploy commands, production smoke commands and configured rollback commands after a failed smoke.

## State

`state.json` is the materialized projection; `state.prev.json` is the last-good snapshot; `events.jsonl` is a SHA-256 hash chain. Schema v4 persists handover, delivery, AI-team and owner-decision state. Journal replay understands project-level lifecycle events as well as task/run/evidence/decision events.

## External boundaries

- GitHub: optional free `gh` adapter.
- CodeAtlas: optional semantic context-provider contract.
- GameForge: optional domain-specific task/workflow-provider contract.
- Remote verification: SSH capability layer; no hosted runner is required.
- Claude/Codex authentication remains owned by their locally installed CLIs; credentials are not stored by SHIPSTATE.
