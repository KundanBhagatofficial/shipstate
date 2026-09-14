# SHIPSTATE

**Local-first execution control plane for AI coding agents.**

SHIPSTATE sits between product intent, a Git repository, and implementation agents. It decides what is eligible, compiles bounded task context, executes work in isolation, verifies deterministic evidence, remembers failures, and integrates only explicitly accepted work.

## 1.0 RC capabilities

- automatic repository profiling for Node/TS/JS, Python, Rust, Go, Java/Kotlin, Swift and Flutter/Dart
- stack/framework/package-manager/test/lint/build detection
- proposed product-doc → task-DAG planning with explicit approval
- Design Locks and path-level architecture protection
- import/symbol/reverse-import/test/Git-aware Context Engine 2
- context/token analytics
- detached Git worktree per run
- strongest-available OS sandbox with explicit degradation reporting
- timeout, cancellation, live logs and process-tree cleanup
- typed Evidence Engine 2
- candidate commits + explicit accept/reject
- stale-base and dirty-main protection
- parallel-safe DAG batch selection and autonomous execution loop
- checksum event journal, versioned schema migration, last-good state and journal replay
- optional GitHub PR/check adapter through the free `gh` CLI
- global project registry and multi-repository workspace manifest
- optional SSH remote diagnostics
- CodeAtlas/GameForge integration contracts
- productized local dashboard and JSON API
- zero runtime npm dependencies

## No paid dependency

SHIPSTATE requires only Node.js 20+ and Git. Manual mode exercises the complete governance lifecycle without Claude, Codex or any subscription. Claude/Codex/GitHub/SSH features are optional adapters around locally installed tools.

## Install

```bash
git clone https://github.com/KundanBhagatofficial/shipstate.git
cd shipstate
npm link
npm run certify
shipstate doctor
```

## Start in any Git project

```bash
cd /path/to/project
shipstate init --name="My Project"
shipstate profile
```

Commit the `.gitignore` change produced by initialization before running agents.

Create/import a task:

```bash
mkdir -p specs
shipstate template TASK-001 "Implement session restore" > specs/TASK-001.md
# edit acceptance criteria / policy
shipstate import specs
shipstate next
```

Run without an AI subscription:

```bash
shipstate run TASK-001 --agent=manual
# edit the returned worktreePath
shipstate verify TASK-001
shipstate accept TASK-001
```

Run a configured agent:

```bash
shipstate run TASK-001 --agent=claude
# or
shipstate run TASK-001 --agent=codex
shipstate verify TASK-001
shipstate accept TASK-001
```

## Dashboard

```bash
shipstate serve --open
```

The UI exposes Now, Tasks, Runs, Evidence, Context/analytics and System views. It binds to `127.0.0.1` by default; mutations require a random per-server session token.

## Product intelligence

`shipstate init` profiles the repository. `shipstate profile` refreshes it. Missing task verification/allowed-path policy can be derived from the profile, while explicit task policy takes precedence.

## Product Owner / planning

```bash
shipstate plan PRODUCT.md TECH_SPEC.md
shipstate plan approve <PLAN-ID>
```

Document-derived work stays `PROPOSED` until approved. SHIPSTATE never silently converts prose into authoritative project truth.

## Design Locks

```markdown
- [security] LOCK-AUTH: paths=src/auth/** :: Authentication must remain server verified.
- [immutable] LOCK-DATA: PostgreSQL remains authoritative persistence.
```

```bash
shipstate locks import DESIGN_LOCKS.md
```

## Autopilot

```bash
shipstate autopilot --agent=claude --max=5 --attempts=2
```

Low-risk tasks may be policy-auto-accepted if configured. Parallel mode selects non-overlapping path scopes:

```bash
shipstate autopilot --agent=codex --parallel=3 --no-auto-accept
```

Parallel verified candidates are intentionally not silently integrated after another candidate moves `HEAD`; stale-base safety wins over throughput.

## GitHub workflow

With the free `gh` CLI installed/authenticated:

```bash
shipstate github status
shipstate github pr-create --title="Verified SHIPSTATE candidate" --head=my-branch
shipstate github pr-view 123
shipstate github pr-checks 123
```

## Project launcher / workspaces

Every initialized project is registered locally:

```bash
shipstate projects
```

A product spanning multiple repositories can create a workspace:

```bash
mkdir my-product-control && cd my-product-control
shipstate workspace init --name="My Product"
shipstate workspace add ../frontend --alias=web
shipstate workspace add ../backend --alias=api
shipstate workspace status
```

## Real-agent certification

CI cannot safely contain your Claude/Codex credentials. Certify real installed agents locally:

```bash
shipstate certify-agent claude
shipstate certify-agent codex
```

Each command creates a disposable repository and proves real adapter → context → isolated execution → deterministic verification → acceptance.

## Release certification

```bash
npm run certify
```

GitHub CI runs the same gate on Ubuntu, macOS and Windows under Node 20 and 22.

## Core invariants

1. Agent output never directly creates `VERIFIED` or `ACCEPTED`.
2. Real work never executes in the user's main working tree.
3. Dependencies require integrated (`ACCEPTED`) prerequisites.
4. Verification emits persisted typed evidence.
5. Reduced sandbox capability is visible and never misrepresented.
6. `.git`, `.shipstate` and `.env*` remain protected.
7. Stale candidates cannot be silently accepted.
8. State mutations are checksum-journaled.
9. No paid/cloud service is required by the kernel.

See `docs/ARCHITECTURE.md`, `docs/TASK_CONTRACTS.md`, `docs/TESTING.md` and `SECURITY.md`.
