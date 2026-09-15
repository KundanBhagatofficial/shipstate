# SHIPSTATE

**Local-first autonomous software delivery control plane for AI engineering teams.**

SHIPSTATE is designed for the point where the important project decisions are already made. The owner provides a complete project contract, hands the repository to the AI team, and monitors delivery instead of repeatedly writing implementation prompts.

Default organization:

- **Human** — Product Owner / Client
- **Codex** — Project Manager + Senior Reviewer
- **Claude** — Developer
- **SHIPSTATE** — deterministic governor, verifier, evidence ledger and delivery controller

## Owner workflow

```text
Create repository + project documents
        ↓
shipstate init
        ↓
complete mandatory project pack + decisions
        ↓
commit project contract
        ↓
shipstate handover audit
        ↓
shipstate handover accept
        ↓
shipstate start   OR   Start AI Team in the web UI
        ↓
monitor Delivery / Decisions
        ↓
intervene only at explicit owner gates
        ↓
certified delivery / authorized deployment
```

The low-level task CLI remains available for debugging and manual operation, but it is no longer the primary owner workflow.

## Install

Requirements: Node.js 20+, Git, and—when using the default autonomous team—authenticated local Codex and Claude CLIs.

```bash
git clone https://github.com/KundanBhagatofficial/shipstate.git
cd shipstate
npm link
npm run certify
shipstate doctor
```

## Initialize a project

Run inside the Git repository to be built:

```bash
shipstate init --name="My Product"
```

SHIPSTATE profiles the repository and creates `shipstate.project.json` plus a uniform project pack under `docs/shipstate/`.

### Mandatory project documents

Every autonomous project uses the same twelve contracts:

1. `PRODUCT.md` — problem, target users, goals, non-goals, scope
2. `FEATURES.md` — approved feature inventory, priorities, dependencies, deferred scope
3. `UX.md` — user flows, screens/surfaces, visual direction, accessibility
4. `FRONTEND.md` — frontend architecture, design system, responsive/platform rules, constraints
5. `ARCHITECTURE.md` — system boundary, components, interfaces, architecture constraints
6. `DATA.md` — model, persistence, migrations, retention/privacy
7. `SECURITY.md` — identity/access, secrets, threat boundaries, security gates
8. `DEVELOPMENT.md` — repository structure, coding conventions, dependencies/integrations, development workflow
9. `TESTING.md` — test layers, quality thresholds, certification evidence
10. `DEPLOYMENT.md` — environments, target, release procedure, rollback
11. `ACCEPTANCE.md` — delivery criteria, required evidence, accepted-limitations policy
12. `DECISIONS.md` — material approved product/design/technical/cost/deployment decisions

Templates deliberately contain `SHIPSTATE:TODO`. Handover cannot pass until every required document is substantive and every TODO marker is removed.

### Mandatory owner decisions

`shipstate.project.json` also requires explicit decisions for:

- product scope
- target users/use cases
- feature scope/priorities
- UX/design direction (or explicit N/A)
- frontend implementation architecture (or explicit N/A)
- system architecture
- data/persistence strategy (or explicit N/A)
- security model
- development strategy/conventions
- testing/certification strategy
- deployment target/rollback strategy (or explicit N/A)
- project acceptance criteria
- decision ledger completeness
- paid-service/dependency/cost policy
- AI-team authority
- deployment authority
- release/handover authority

Approve from the Handover screen, edit the JSON contract, or use:

```bash
shipstate handover decision product_scope approved --note="scope frozen"
shipstate handover decision frontend_implementation not_applicable --note="headless service"
```

Then commit the control files:

```bash
git add docs/shipstate shipstate.project.json .gitignore
git commit -m "docs: approve project handover contract"
```

## Handover gate

```bash
shipstate handover audit
```

Development is blocked if any required document/decision is incomplete, automatic deployment lacks deploy/smoke commands, or the governed Git tree is dirty.

When the audit reports `ready: true`:

```bash
shipstate handover accept
```

SHIPSTATE hashes the approved contract and protects `shipstate.project.json` plus `docs/shipstate/**`. Editing project truth afterwards invalidates the handover and requires audit + acceptance again.

## Start autonomous delivery

CLI:

```bash
shipstate start
```

Web UI:

```bash
shipstate serve --open
```

Open **Delivery** and click **Start AI Team**.

The controller executes:

```text
Codex handover preflight
    ↓
Codex roadmap / task DAG
    ↓
Codex bounded task brief
    ↓
Claude implementation in isolated Git worktree
    ↓
SHIPSTATE deterministic verification
    ↓
Codex senior review
    ├─ APPROVE → SHIPSTATE integrates
    ├─ REPAIR  → Claude repair
    ├─ REPLAN  → Codex adjusts roadmap
    └─ OWNER_DECISION_REQUIRED → owner gate
    ↓
next task
    ↓
Codex completion review
    ↓
SHIPSTATE project certification
    ↓
authorized deployment + production smoke + optional rollback
    ↓
DELIVERED
```

Neither AI agent can directly mark a task VERIFIED/ACCEPTED or a project DELIVERED.

## Owner decision gates

Normal implementation choices remain autonomous. The owner is interrupted for decisions outside delegated authority or after bounded recovery is exhausted: scope conflicts, architecture/security changes, paid-service/cost changes, destructive migrations, repeated failures, or configured release/deployment gates.

```bash
shipstate decision list
shipstate decision resolve <DECISION-ID> <resolution> --note="..."
shipstate resume
```

Choosing `replan` causes Codex to rebuild/extend the implementation path on resume. Approving a release/deployment gate authorizes only that specific gate.

## Pause / resume

```bash
shipstate pause --reason="owner review"
shipstate resume
```

Pause is safe-boundary oriented: an already-running bounded task may finish, then the controller stops before selecting the next task.

## Authority contract

The generated `shipstate.project.json` defaults to:

```json
{
  "roles": {
    "productOwner": "human",
    "manager": "codex",
    "reviewer": "codex",
    "developer": "claude",
    "verifier": "shipstate"
  },
  "autonomy": {
    "taskPlanning": "automatic",
    "taskSelection": "automatic",
    "implementation": "automatic",
    "testing": "automatic",
    "repairs": "automatic",
    "integration": "automatic",
    "architectureChanges": "owner_gate",
    "securityModelChanges": "owner_gate",
    "paidServices": "owner_gate",
    "deployment": "owner_gate",
    "release": "owner_gate"
  },
  "limits": {
    "maxRepairCycles": 3,
    "maxTasksPerSession": 100
  },
  "delivery": {
    "buildCommands": [],
    "deployCommands": [],
    "smokeCommands": [],
    "rollbackCommands": []
  }
}
```

For unattended production deployment set `autonomy.deployment` to `automatic` and provide deterministic deploy + production-smoke commands before accepting handover. Rollback commands are optional but recommended.

## Project lifecycle

```text
PROJECT_SETUP
 -> HANDOVER_REVIEW
 -> READY_FOR_HANDOVER
 -> AUTONOMOUS_DEVELOPMENT
 -> INTERNAL_CERTIFICATION
 -> RELEASE_CANDIDATE
 -> DEPLOYMENT
 -> DELIVERY_VALIDATION
 -> DELIVERY_READY
 -> DELIVERED
```

Exception states: `OWNER_DECISION_REQUIRED`, `PAUSED`, `BLOCKED`, `FAILED_CERTIFICATION`.

## Dashboard

- **Delivery** — project lifecycle, AI team, progress/current work, action-required status
- **Handover** — mandatory docs/decisions, blockers, acceptance
- **Decisions** — owner exception gates and AI recommendation
- **Tasks** — Codex-maintained implementation DAG
- **Runs** — developer attempts
- **Evidence** — deterministic task/project/deployment evidence
- **Context** — context/token metrics
- **System** — Git, sandbox, journal, GitHub, Design Locks, registry

## Token efficiency

Initial preflight/planning can inspect the full approved project pack. Recurring task-manager and reviewer calls use compact project projections, relevant task relationships and bounded document slices. Claude receives a separate task-specific context containing the Codex brief, related code/tests, Design Locks, prior failures and review repair feedback. Role prompt-token estimates are recorded in the decision ledger.

## Retained control-plane capabilities

SHIPSTATE still provides automatic stack profiling, import/symbol/reverse-import/test/Git-aware context, detached Git worktrees, strongest-available local sandboxing, timeout/cancellation/process cleanup, typed evidence, stale-base protection, checksum event journal/replay, GitHub `gh` integration, project registry/workspaces, remote verification and optional CodeAtlas/GameForge contracts. There are zero runtime npm dependencies.

## Manual/operator mode

```bash
shipstate template TASK-001 "Implement feature" > specs/TASK-001.md
shipstate import specs
shipstate run TASK-001 --agent=claude
shipstate verify TASK-001
shipstate accept TASK-001
```

Legacy `shipstate autopilot` remains for task-level operation.

## Certification

```bash
npm run certify
shipstate certify-agent claude
shipstate certify-agent codex
```

GitHub CI runs `npm run certify` on Ubuntu, macOS and Windows with Node 20 and 22. Provider credentials are intentionally not stored in CI.

See `docs/ARCHITECTURE.md`, `docs/TASK_CONTRACTS.md`, `docs/TESTING.md`, `SECURITY.md`, and `CHANGELOG.md`.
