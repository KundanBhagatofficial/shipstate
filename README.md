# SHIPSTATE

**Local-first autonomous software delivery control plane for AI engineering teams.**

SHIPSTATE is for the point where material product decisions are already made. The owner supplies the governed repository and project contract, hands delivery to the AI team, and monitors progress instead of repeatedly writing implementation prompts.

Default organization:

- **Human** — Product Owner / Client
- **Codex** — Project Manager + Senior Reviewer
- **Claude** — preferred Developer
- **Codex** — automatic Developer fallback when Claude is quota/auth/provider unavailable
- **SHIPSTATE** — deterministic governor, verifier, evidence ledger and delivery controller

Current stable release: **1.2.0**.

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
monitor Delivery / Decisions / Intelligence
        ↓
intervene only at explicit owner gates
        ↓
certified delivery / authorized deployment
```

The task-level CLI remains available for debugging and manual operation, but it is not the primary owner workflow.

## Install

Requirements: Node.js 20+, Git, and—when using the default autonomous team—authenticated local Claude and Codex CLIs. Claude is preferred for implementation; Codex is the default bounded fallback.

```bash
git clone https://github.com/KundanBhagatofficial/shipstate.git
cd shipstate
npm link
npm run certify
shipstate doctor
```

SHIPSTATE has zero runtime npm dependencies.

## Initialize a project

Inside the Git repository to be built:

```bash
shipstate init --name="My Product"
```

SHIPSTATE profiles the repository and creates `shipstate.project.json` plus the governed project pack under `docs/shipstate/`.

### Mandatory project documents

1. `PRODUCT.md` — problem, target users, goals, non-goals, scope
2. `FEATURES.md` — approved feature inventory, priorities, dependencies, deferred scope
3. `UX.md` — user flows, screens/surfaces, visual direction, accessibility
4. `FRONTEND.md` — frontend architecture, design system, responsive/platform rules
5. `ARCHITECTURE.md` — system boundary, components, interfaces, constraints
6. `DATA.md` — model, persistence, migrations, retention/privacy
7. `SECURITY.md` — identity/access, secrets, threat boundaries, security gates
8. `DEVELOPMENT.md` — repository structure, coding conventions, dependencies/integrations
9. `TESTING.md` — test layers, quality thresholds, certification evidence
10. `DEPLOYMENT.md` — environments, target, release procedure, rollback
11. `ACCEPTANCE.md` — delivery criteria, evidence, accepted-limitations policy
12. `DECISIONS.md` — material approved product/design/technical/cost/deployment decisions

Templates contain `SHIPSTATE:TODO`. Handover cannot pass until required documents are substantive and TODO markers are removed.

### Mandatory owner decisions

`shipstate.project.json` records explicit authority for product scope, target users, feature priorities, UX/frontend choices, system/data/security architecture, development/testing strategy, deployment/rollback, acceptance, costs/paid services, AI-team authority, deployment authority and release/handover authority.

```bash
shipstate handover decision product_scope approved --note="scope frozen"
shipstate handover decision frontend_implementation not_applicable --note="headless service"
```

Commit the governed inputs:

```bash
git add docs/shipstate shipstate.project.json .gitignore
git commit -m "docs: approve project handover contract"
```

## Handover gate

```bash
shipstate handover audit
shipstate handover advise ui   # optional pre-handover advisory
shipstate handover accept
```

The audit blocks autonomous development when required documents/decisions are incomplete, configured automatic deployment lacks required commands, or the governed Git tree is dirty. Acceptance hashes the governed contract and protects `shipstate.project.json` plus `docs/shipstate/**`. Changing project truth invalidates accepted handover and requires audit + acceptance again.

## Autonomous delivery

```bash
shipstate start
```

Or:

```bash
shipstate serve --open
```

The controller executes:

```text
Codex handover preflight
    ↓
Codex roadmap / dependency-aware task DAG
    ↓
Codex bounded task brief
    ↓
Context Router 3 compiles task-specific ProjectTruth + code intelligence
    ↓
Claude implementation in isolated Git worktree
    ├─ quota/auth/provider unavailable before source changes → Codex continues the same task
    └─ after cooldown, next task probes Claude and fails back automatically
    ↓
SHIPSTATE deterministic verification
    ↓
Codex senior review
    ├─ APPROVE → SHIPSTATE integrates
    ├─ REPAIR  → systematic diagnosis + preferred/fallback developer repair
    ├─ REPLAN  → Codex adjusts roadmap
    └─ OWNER_DECISION_REQUIRED → owner gate
    ↓
next task
    ↓
Codex completion review
    ↓
SHIPSTATE project + quality certification
    ↓
authorized deployment + production smoke + optional rollback
    ↓
DELIVERED
```

Neither AI agent can directly mark a task VERIFIED/ACCEPTED or a project DELIVERED.

## ProjectTruth and Context Router 3

SHIPSTATE 1.2 compiles the approved project pack into provenance-bearing ProjectTruth facts. Fact IDs remain stable when unchanged statements are merely reordered within the same source section. Recurring manager, reviewer and developer runs select relevant facts instead of repeatedly transmitting the whole project specification.

```bash
shipstate truth compile
shipstate truth
shipstate context TASK-001
shipstate analytics
```

For governed autonomous tasks, Context Router 3 combines:

- task contract, acceptance criteria and Codex brief
- relevant ProjectTruth IDs
- Design Locks
- structural intelligence
- optional semantic intelligence
- narrow UI intelligence for UI tasks
- prior review/repair evidence
- exact source/test context

Every package is hard-budgeted and emits a receipt with selected facts/files, provider choice and per-provider latency, context hash, actual tokens, estimated naive tokens and estimated tokens avoided.

Manual/operator projects without a handover contract keep the lightweight legacy context path.

## Adaptive intelligence providers

Providers are optional, read-only intelligence sources. They cannot mutate SHIPSTATE state, verification, acceptance or project truth.

```bash
shipstate providers
```

Built-in/default boundaries include:

- **shipstate-lite** — zero-dependency structural fallback
- **code-review-graph** — optional persistent structural/impact/architecture intelligence
- **CodeAtlas** — optional semantic/architecture compatibility provider
- **UI/UX Pro Max** — narrow advisory UI implementation intelligence
- **GameForge** — workflow compatibility provider
- **native web discoverability** — deterministic public-surface checks
- **GEO/SEO** — advisory public-surface intelligence only

Automatic routing starts from task/repository suitability and then adapts using measured local ROI: context tokens avoided, provider latency and failure history. The adjustment is confidence-weighted so a single sample cannot dominate selection. If an automatic provider fails, SHIPSTATE tries the next eligible provider; `shipstate-lite` remains the structural fallback.

Explicit provider configuration remains authoritative. Provider processes use bounded output/time and sanitized environment handling.

See `docs/INTELLIGENCE.md` for the full 1.2 model.

## Systematic repair

SHIPSTATE does not treat repeated failures as a blind retry loop:

```text
failure
  -> classify
  -> collect evidence
  -> Codex root-cause hypothesis
  -> minimal repair contract
  -> regression-test expectation where applicable
  -> preferred developer repair (Claude; Codex fallback on provider availability)
  -> SHIPSTATE verification
  -> Codex review
```

Repair Episodes persist in project state/history. After the configured repair budget is exhausted, Codex attempts an in-scope replan before SHIPSTATE asks the owner for a decision.

### Developer provider failover

By default, `roles.developer` is `claude` and `roles.developerFallbacks` is `["codex"]`. A strong provider-availability failure (quota/session exhaustion, authentication unavailable, or executable/provider unavailable) with **no source changes** immediately continues the same bounded task on the next fallback without consuming a repair cycle. SHIPSTATE persists the active failover in delivery state, retries the preferred developer after `limits.developerFailbackProbeMs` (default 300000 ms), and clears failover after a successful preferred-provider run. If source files were already changed, normal verification/repair rules apply instead of silently switching models.

## Quality and discoverability

SHIPSTATE derives expected quality dimensions from project class/platforms, including web accessibility/responsiveness/browser E2E/performance, iOS/Android interaction/device behavior and public-surface discoverability.

```bash
shipstate quality
shipstate quality certify
```

The quality profile is an evidence requirement model. Accessibility, performance, mobile/device and browser requirements must be backed by deterministic project/task commands and evidence in the governed test contract. SHIPSTATE provides native deterministic discoverability certification for governed public web surfaces. Advisory UI/GEO provider output is not release evidence by itself.

Finalization requires deterministic project certification plus required SHIPSTATE quality certification before `RELEASE_CANDIDATE`.

## Owner decision gates

Routine implementation choices remain autonomous. The owner is interrupted for choices outside delegated authority or when autonomous recovery/replan has no valid in-scope path.

```bash
shipstate decision list
shipstate decision resolve <DECISION-ID> <resolution> --note="..."
shipstate resume
```

Configured release/deployment gates are independently authorized; approving one does not implicitly approve another.

## Pause / resume

```bash
shipstate pause --reason="owner review"
shipstate resume
```

Pause is safe-boundary oriented: a currently running bounded task may finish, then the controller stops before selecting the next task.

## Cross-repository projects and Hub

The dependency command is ordered **upstream prerequisite first, downstream dependent second**.

```bash
shipstate workspace init --name=my-workspace
shipstate workspace add ../api --alias=api
shipstate workspace add ../web --alias=web
shipstate workspace depend api:API-017 web:WEB-031
shipstate workspace status
shipstate hub
```

Cross-repository dependencies participate in eligibility: the upstream task must be ACCEPTED before the downstream task is eligible.

`shipstate hub` summarizes lifecycle, completion, active work and owner decisions across registered local SHIPSTATE projects.

## Remote execution

Remote execution is optional; the local machine remains authoritative for state and verification.

```bash
shipstate remote doctor user@host
shipstate run TASK-001 --agent=claude --remote=user@host
shipstate start --remote=user@host
```

SHIPSTATE synchronizes the isolated worktree to a temporary remote workspace, executes with heartbeat/timeout/cancellation/log capture, syncs the result back, cleans the remote workspace, then performs normal local verification and review.

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

- **Delivery** — lifecycle, team, progress/current work, action-required status
- **Handover** — governed docs/decisions, blockers, acceptance
- **Decisions** — owner exception gates
- **Tasks** — Codex-maintained implementation DAG
- **Runs** — developer attempts and execution boundary
- **Evidence** — deterministic task/project/deployment evidence
- **Context** — token budgets, selected files, provider and estimated savings
- **Intelligence** — ProjectTruth, provider detection/ROI, quality profile and Repair Episodes
- **System** — Git, sandbox, journal, GitHub, Design Locks and project registry

The HTTP server binds to loopback by default, requires a random mutation token for state-changing API calls, and serves dashboard files only from the canonical web root.

## Manual/operator mode

```bash
shipstate template TASK-001 "Implement feature" > specs/TASK-001.md
shipstate import specs
shipstate run TASK-001 --agent=claude
shipstate verify TASK-001
shipstate accept TASK-001
```

Legacy `shipstate autopilot` remains available for task-level operation.

## Certification

Repository certification:

```bash
npm run certify
```

Real local agent certification:

```bash
shipstate certify-agent claude
shipstate certify-agent codex
shipstate certify-team
```

GitHub CI runs `npm run certify` on Ubuntu, macOS and Windows with Node 20 and 22. CI intentionally does not store provider or agent credentials; authenticated Claude/Codex team certification is therefore host-specific.

See `docs/ARCHITECTURE.md`, `docs/INTELLIGENCE.md`, `docs/TASK_CONTRACTS.md`, `docs/TESTING.md`, `SECURITY.md`, and `CHANGELOG.md`.
