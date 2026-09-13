# SHIPSTATE

**Local-first execution control plane for AI coding agents.**

SHIPSTATE answers four questions continuously:

1. **What should happen next?**
2. **What context does the agent actually need?**
3. **Did the implementation satisfy deterministic evidence?**
4. **Has the verified work actually been integrated into the repository?**

It is not an IDE, another chat interface, CodeAtlas, or GameForge. SHIPSTATE governs execution.

## What is included in 0.2 RC

- dependency-aware task DAG
- Markdown execution contracts
- bounded task context compiler with lexical repository discovery
- isolated Git worktree per agent run
- `manual`, `dry-run`, Claude Code and Codex adapters
- allowed/protected path policy
- deterministic verification commands
- evidence ledger with command/diff/policy evidence
- verified candidate commits
- explicit accept/reject before integration
- stale-base protection before cherry-pick
- repeated-failure loop guard
- crash-state recovery
- append-only event journal
- local dashboard + local JSON API
- CLI for every lifecycle operation
- zero runtime npm dependencies

## Cost model

SHIPSTATE itself needs **no subscription and no hosted service**. Node.js and Git are the only required runtime dependencies.

`manual` mode lets you use any editor or locally available tool in the isolated worktree. `claude` and `codex` are optional executable adapters and are never required to use or test SHIPSTATE.

## Requirements

- Node.js 20+
- Git
- a repository with at least one commit

## Install for development

```bash
git clone https://github.com/KundanBhagatofficial/shipstate.git
cd shipstate
npm link
shipstate doctor
```

There are currently no package dependencies to download.

## Start a project

Run from the **root of the Git repository you want SHIPSTATE to govern**:

```bash
shipstate init --name="My Product"
```

`init` creates `.shipstate/` and ensures it is ignored by Git. Commit any `.gitignore` change before executing an agent because SHIPSTATE requires the main working tree to be clean.

Create task contracts:

```bash
shipstate template TASK-001 "Restore session before API boot" > specs/TASK-001.md
```

Then import them:

```bash
shipstate import specs
shipstate status
shipstate next
```

## Run without any AI subscription

```bash
shipstate run TASK-001 --agent=manual
```

SHIPSTATE prints a run object containing `worktreePath`. Open that directory in your editor, make the implementation, then:

```bash
shipstate verify TASK-001
shipstate accept TASK-001
```

Until `accept`, the real branch is untouched.

## Run with a supported local agent executable

```bash
shipstate run TASK-001 --agent=claude
# or
shipstate run TASK-001 --agent=codex
```

The executable must already be installed and authenticated/configured independently. SHIPSTATE does not require or purchase any account.

## Dashboard

```bash
shipstate serve --open
```

Default address: `http://127.0.0.1:4317`

The dashboard exposes:

- **Now** — next action, active work, release pulse, blockers
- **Tasks** — complete task graph and states
- **Runs** — agent attempt ledger
- **Evidence** — verification and diff evidence
- **System** — environment, imports, default agent and recovery

Mutation endpoints require a random per-server session token and the server binds to loopback by default.

## Task lifecycle

```text
PENDING -> READY -> RUNNING -> IMPLEMENTED -> VERIFYING -> VERIFIED
                                                          |
                                                          v
                                                     ACCEPTING
                                                          |
                                                          v
                                                       ACCEPTED
```

Failure paths lead to `FAILED`, `BLOCKED`, or `REJECTED`.

**Important:** a dependent task is eligible only when every dependency is `ACCEPTED`, not merely `VERIFIED`. This guarantees the dependent agent executes against repository state that actually contains its prerequisites.

## Certification

```bash
npm run certify
```

Certification performs JavaScript syntax checks, the complete automated test suite, and a clean-repository end-to-end smoke test:

```text
fresh Git repo
 -> task import
 -> isolated manual worktree
 -> implementation change
 -> deterministic verification
 -> evidence + candidate commit
 -> main tree still unchanged
 -> explicit acceptance
 -> candidate integrated
```

See [docs/TESTING.md](docs/TESTING.md) for the manual release checklist.

## Core invariants

- An agent cannot mark work `VERIFIED` or `ACCEPTED`.
- Verification must produce evidence.
- Agent work never executes directly in the main working tree.
- `.git`, `.shipstate`, and `.env*` are protected by default.
- Path-policy violations block a task.
- Acceptance refuses to apply a candidate if repository `HEAD` moved after execution began.
- Three identical failure fingerprints block further automatic retries.
- Every state mutation is journaled.
- No cloud service is required by the kernel.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Task contracts](docs/TASK_CONTRACTS.md)
- [Testing / release certification](docs/TESTING.md)
- [Security model](SECURITY.md)
