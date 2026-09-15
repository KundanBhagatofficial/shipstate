# SHIPSTATE

**Local-first autonomous software delivery control plane for AI engineering teams.**

SHIPSTATE lets a project owner finish the product decisions first, then hand the repository to an AI engineering team for autonomous implementation, review, verification and delivery.

Default team:

- **Human** — Product Owner
- **Codex** — Project Manager + Senior Reviewer
- **Claude** — Developer
- **SHIPSTATE** — deterministic execution governor, evidence authority and lifecycle controller

The owner should manage the project, not continuously author implementation prompts.

## Owner workflow

```text
Create repository
    ↓
shipstate init
    ↓
Complete mandatory project pack
    ↓
Resolve mandatory project decisions
    ↓
Commit the project contract
    ↓
shipstate handover audit
    ↓
shipstate handover accept
    ↓
shipstate start
    ↓
Monitor dashboard
    ↓
Intervene only at explicit owner decision gates
    ↓
Certified delivery / deployment
```

Start the dashboard at any time:

```bash
shipstate serve --open
```

Default address: `http://127.0.0.1:4317`.

## Mandatory project pack

`shipstate init` creates a canonical committed project pack under `docs/shipstate/` plus `shipstate.project.json`.

Every project uses the same documents:

- `docs/shipstate/PRODUCT.md` — problem, target users, goals, non-goals, product scope
- `docs/shipstate/FEATURES.md` — approved feature inventory, priorities, dependencies, deferred scope
- `docs/shipstate/UX.md` — user flows, screens, states, design system, accessibility
- `docs/shipstate/ARCHITECTURE.md` — system boundary, components, interfaces and architecture constraints
- `docs/shipstate/DATA.md` — model, persistence, migrations, retention and privacy
- `docs/shipstate/SECURITY.md` — identity, access, secrets, trust boundaries and security gates
- `docs/shipstate/TESTING.md` — required test layers, thresholds and certification evidence
- `docs/shipstate/DEPLOYMENT.md` — environments, target, release procedure and rollback
- `docs/shipstate/ACCEPTANCE.md` — project completion and delivery contract
- `docs/shipstate/DECISIONS.md` — material product/technical decision ledger
- `shipstate.project.json` — machine-readable AI roles, authority, limits, deployment commands and mandatory decision approvals

SHIPSTATE refuses project handover while a mandatory document contains `SHIPSTATE:TODO`, has insufficient substantive content, a mandatory owner decision remains pending, or the project contract is uncommitted.

## Mandatory owner decisions

Before autonomous development starts, the owner must explicitly decide/approve:

- product scope
- target users/use cases
- feature scope and priorities
- UX/design direction, or explicit N/A
- system architecture
- data model/persistence, or explicit N/A
- security model
- testing strategy
- deployment target, or explicit N/A
- acceptance criteria
- decision ledger
- cost/paid-service policy
- AI authority
- deployment authority
- release authority

Use the Handover page in the web UI, edit `shipstate.project.json`, or use CLI:

```bash
shipstate handover decision product_scope approved --note="scope frozen"
shipstate handover decision ux_design not_applicable --note="headless library"
```

Then commit the documents and contract.

## Handover

Audit:

```bash
shipstate handover audit
```

When every deterministic gate is green:

```bash
shipstate handover accept
```

SHIPSTATE hashes the approved project contract and protects `shipstate.project.json` plus `docs/shipstate/**` from implementation agents. Changing them after handover invalidates the handover and requires re-approval.

## Autonomous development

Start:

```bash
shipstate start
```

The delivery controller performs:

```text
Codex handover preflight
        ↓
Codex implementation roadmap
        ↓
Codex selects / briefs next bounded task
        ↓
Claude implements in isolated Git worktree
        ↓
SHIPSTATE deterministic verification
        ↓
Codex senior code/product review
        ↓
APPROVE ───────→ SHIPSTATE integrates candidate
REPAIR  ───────→ Claude repair loop
REPLAN  ───────→ Codex roadmap adjustment
OWNER DECISION → only affected path pauses
        ↓
next task
        ↓
Codex completion review
        ↓
SHIPSTATE project certification
        ↓
optional authorized deployment + production smoke
        ↓
DELIVERED
```

Codex and Claude cannot directly create `VERIFIED`, `ACCEPTED`, or `DELIVERED`. Those remain SHIPSTATE-owned states backed by deterministic evidence.

Pause/resume:

```bash
shipstate pause --reason="owner review"
shipstate resume
```

## Owner decision gates

Autonomous development is exception-driven. Routine implementation decisions remain with the AI team. The owner is interrupted only for undelegated decisions such as conflicting scope, architecture/security changes, paid-service/cost changes, destructive migrations, exhausted repair loops, or configured release/deployment approval gates.

```bash
shipstate decision list
shipstate decision resolve owner-ab12cd34 approve --note="approved"
shipstate resume
```

The web UI exposes the same decisions as buttons when the decision has predefined options.

## `shipstate.project.json`

The generated contract contains four important sections:

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

To allow unattended production deployment, set `autonomy.deployment` to `automatic` and supply deterministic deploy + production smoke commands. Handover will refuse automatic deployment without both.

## Project lifecycle

```text
PROJECT_SETUP
    ↓
HANDOVER_REVIEW
    ↓
READY_FOR_HANDOVER
    ↓
AUTONOMOUS_DEVELOPMENT
    ↓
INTERNAL_CERTIFICATION
    ↓
RELEASE_CANDIDATE
    ↓
DEPLOYMENT (when configured)
    ↓
DELIVERY_VALIDATION
    ↓
DELIVERY_READY
    ↓
DELIVERED
```

Exception states include `OWNER_DECISION_REQUIRED`, `PAUSED`, `BLOCKED`, and `FAILED_CERTIFICATION`.

Task-level lifecycle and Git worktree isolation remain unchanged underneath this project lifecycle.

## Dashboard

The owner-facing dashboard now exposes:

- **Delivery** — project lifecycle, AI team, progress, current work and whether owner action is required
- **Handover** — mandatory documents, decisions, blockers and handover acceptance
- **Decisions** — exception gates requiring the owner
- **Tasks** — AI-maintained implementation DAG
- **Runs** — Claude/manual developer execution ledger
- **Evidence** — deterministic verification, policy, diff and project-certification evidence
- **Context** — bounded context/token metrics
- **System** — Git, sandbox, journal, GitHub, Design Locks and project registry

Low-level Run/Verify/Accept controls remain available for debugging and manual override, but they are no longer the primary owner workflow.

## Existing capabilities retained

SHIPSTATE still includes:

- automatic repository profiling for Node/TS/JS, Python, Rust, Go, Java/Kotlin, Swift and Flutter/Dart
- Context Engine 2 with import/symbol/reverse-import/test/Git awareness
- detached Git worktree per developer run
- strongest-available OS sandbox with explicit degradation reporting
- timeout/cancellation/process-tree cleanup
- typed evidence ledger
- stale-base and dirty-main protections
- checksum event journal, schema migrations, last-good state and replay
- optional GitHub PR/check adapter via free `gh`
- global project registry and multi-repository workspace manifests
- remote verification and CodeAtlas/GameForge integration contracts
- zero runtime npm dependencies

## Install

Requirements: Node.js 20+, Git, and—when using the default autonomous team—authenticated local Codex and Claude CLIs.

```bash
git clone https://github.com/KundanBhagatofficial/shipstate.git
cd shipstate
npm link
npm run certify
shipstate doctor
```

## Manual / advanced task mode

The original task-level control plane remains available:

```bash
shipstate template TASK-001 "Implement feature" > specs/TASK-001.md
shipstate import specs
shipstate run TASK-001 --agent=claude
shipstate verify TASK-001
shipstate accept TASK-001
```

Legacy `shipstate autopilot` also remains available. New projects should normally use project handover + `shipstate start` instead.

## Real-agent certification

CI does not contain your provider credentials. Test authenticated local adapters with:

```bash
shipstate certify-agent claude
shipstate certify-agent codex
```

## Release certification

```bash
npm run certify
```

CI runs the same gate on Ubuntu, macOS and Windows under Node 20 and 22.

## Core invariants

1. The owner controls canonical product truth and delegated authority.
2. Project development cannot start before deterministic handover gates pass.
3. Approved handover documents are protected from implementation agents.
4. Codex may plan/manage/review but cannot grant deterministic verification.
5. Claude may implement but cannot approve its own work.
6. SHIPSTATE owns verification, acceptance, integration and project lifecycle state.
7. Agent work never executes directly in the user's main working tree.
8. Stale candidates cannot be silently accepted.
9. Material undelegated decisions become explicit owner gates rather than AI guesses.
10. No paid/cloud service is required by the SHIPSTATE kernel itself.

See `docs/ARCHITECTURE.md`, `docs/TASK_CONTRACTS.md`, `docs/TESTING.md`, and `SECURITY.md` for implementation details.
