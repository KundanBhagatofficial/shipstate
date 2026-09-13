# SHIPSTATE

**Local-first execution control plane for AI coding agents.**

> Know what should happen next. Give an agent only the context it needs. Refuse to call work complete without evidence.

SHIPSTATE sits between product intent and coding agents such as Claude Code or Codex. The alpha is intentionally small, auditable, and dependency-free.

## What works in Alpha

- Persistent project/task state in `.shipstate/state.json`
- Append-only event journal in `.shipstate/events.jsonl`
- Markdown task contracts with dependencies, priority, acceptance criteria, explicit repository context, and verification commands
- Deterministic DAG-aware `next` task selection
- Task-specific context package generation
- Local `claude` and `codex` executable adapters plus safe `dry-run`
- Evidence-gated verification: an agent can reach `IMPLEMENTED`; only SHIPSTATE verification can reach `VERIFIED`
- Failure fingerprints and compact run history for cross-agent handoff
- Zero hosted services, API keys, paid subscriptions, databases, or framework dependencies required

## Requirements

- Node.js 20+
- Git is recommended
- Claude Code and/or Codex CLI are optional and only needed for their respective agent adapters

## Quick start

```bash
npm test
node src/cli.js doctor
node src/cli.js init
node src/cli.js import examples/specs
node src/cli.js status
node src/cli.js next
node src/cli.js context TASK-001
node src/cli.js run TASK-001 --agent=dry-run
node src/cli.js verify TASK-001
node src/cli.js status
```

To use a real local agent:

```bash
node src/cli.js run TASK-001 --agent=claude
# or
node src/cli.js run TASK-001 --agent=codex
```

## Task contract

```markdown
# Fix session restoration race
Id: AUTH-042
Depends On: AUTH-011
Priority: 90

## Objective
Restore the persisted session before API bootstrap.

## Acceptance Criteria
- No authenticated API request occurs before restoration finishes.
- Invalid refresh credentials clear the session.

## Verification
- npm test

## Files
- src/auth/session.js
- test/auth/session.test.js
```

## State invariant

```text
PENDING -> READY -> RUNNING -> IMPLEMENTED -> VERIFYING -> VERIFIED
                         \\-> FAILED          \\-> FAILED
```

`VERIFIED` is deliberately inaccessible from an agent run. Verification evidence owns that transition.

## Product boundary

SHIPSTATE is not CodeAtlas and not GameForge. It does not attempt full architecture comprehension, game reconstruction, cloud CI, project management, or an IDE. Its kernel owns execution truth: **task state, context, agent runs, evidence, failure memory, and next action**.

## Roadmap after proof

1. Git worktree isolation and changed-file policy enforcement
2. Failure-loop guard/escalation policy
3. Git diff/commit evidence
4. Context expansion from imports/tests/git history
5. Design locks and protected paths
6. Thin local dashboard
7. Optional CodeAtlas semantic-context adapter

## License

MIT
