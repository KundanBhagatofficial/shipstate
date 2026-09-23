# SHIPSTATE 1.2 Intelligence and Quality Architecture

SHIPSTATE 1.2 keeps the deterministic delivery kernel authoritative while allowing optional intelligence providers to improve context selection, review quality and domain-specific guidance.

## Authority model

The order of authority is:

1. approved canonical project documents and resolved owner decisions
2. compiled ProjectTruth
3. Design Locks and task contracts
4. deterministic SHIPSTATE verification/evidence
5. optional provider output

Providers are read-only from the control plane's perspective. A provider may suggest files, relationships, UI guidance, architecture context or public-surface findings, but it cannot change task state, project truth, verification status, acceptance or delivery state.

## ProjectTruth

After handover, SHIPSTATE compiles the canonical project pack into stable facts with source provenance. Fact IDs are derived from the source section and normalized statement, so simple reordering does not invalidate references. Recurring manager, reviewer and developer contexts select only the facts relevant to the current task instead of resending all project documents.

Commands:

```bash
shipstate truth compile
shipstate truth
```

Changing the governed project contract/documents invalidates accepted handover truth and requires a new handover audit/acceptance.

## Context Router 3

For governed autonomous projects, the router builds a bounded context from:

- task contract and Codex manager brief
- selected ProjectTruth facts
- Design Locks
- structural provider output
- optional semantic provider output
- narrow UI intelligence for UI tasks
- prior repair/review feedback
- selected source files and adjacent tests

Every package has a hard token budget and a receipt under `.shipstate/contexts/` containing selected ProjectTruth IDs, files, provider choices/latency, context hash, estimated naive tokens and estimated tokens avoided.

Manual/operator projects that do not use a handover contract retain the lightweight legacy context path.

## Adaptive provider routing

`shipstate providers` shows detection and measured ROI. Automatic routing combines each provider's task/repository suitability score with a confidence-weighted adjustment based on recent local measurements:

- estimated context tokens avoided
- actual context tokens
- per-provider latency
- provider failure rate

The adjustment starts conservatively and gains weight as measurements accumulate. Explicit provider configuration remains authoritative; `off` disables a capability. A configured provider that is unavailable fails clearly instead of silently pretending it ran.

If an automatically chosen provider fails, SHIPSTATE tries the next eligible provider. `shipstate-lite` remains the structural zero-dependency fallback.

### Structural providers

- `shipstate-lite` — built-in imports, reverse imports, symbols, tests and lexical context
- `code-review-graph` — optional persistent structural graph, impact/architecture/flow context; isolated per repository and Git HEAD

### Other optional provider boundaries

- CodeAtlas — semantic/architecture context compatibility
- UI/UX Pro Max — task-specific advisory UI guidance
- GameForge — workflow provider compatibility
- GEO/SEO — advisory public-surface intelligence only

Command providers run with bounded output/time and a sanitized environment. Provider output never overrides ProjectTruth or Design Locks.

## Systematic repair

Autonomous failures are not handled as blind retries. SHIPSTATE records a Repair Episode:

```text
failure
  -> classify
  -> collect evidence
  -> Codex root-cause hypothesis
  -> minimal repair contract
  -> regression-test expectation when applicable
  -> preferred developer repair (Claude; Codex fallback on provider availability)
  -> deterministic verification
  -> Codex review
```

After bounded repair exhaustion, Codex attempts an in-scope replan before SHIPSTATE opens an owner decision gate.

### Developer failover / failback

Developer routing is independent from intelligence-provider fallback. The default route is Claude first with Codex as the bounded implementation fallback. Quota/session exhaustion, authentication unavailability, or an unavailable executable can trigger immediate same-task failover only when the failed provider produced no source changes. The failover state is journaled and replayable. During the configured cooldown the fallback is preferred; after `developerFailbackProbeMs` (default five minutes), the next task probes Claude first and successful execution clears the failover. A provider failure after source changes remains a normal implementation failure and enters the evidence/repair path.

## Quality profiles

SHIPSTATE derives expected quality dimensions from the governed project class/platform stack. Examples include accessibility, responsive behavior, browser E2E, performance, safe areas, orientation/resume, touch/device classes and discoverability.

```bash
shipstate quality
shipstate handover advise ui
shipstate quality certify
```

The profile is an evidence requirement model, not a claim that every dimension has a built-in runner. Project-specific accessibility/performance/mobile/browser requirements must be backed by deterministic task/project commands and evidence defined by the project contract. SHIPSTATE currently provides a native deterministic discoverability gate for governed public web surfaces; advisory GEO/UI providers are not release evidence by themselves.

Project finalization requires normal deterministic project certification and required SHIPSTATE quality certification before `RELEASE_CANDIDATE`.

## Distributed execution

Cross-repository dependencies can be added to a SHIPSTATE workspace; the first task reference is the upstream prerequisite and the second is the downstream dependent. Upstream tasks must be ACCEPTED before dependent work becomes eligible.

```bash
shipstate workspace init --name=my-workspace
shipstate workspace add ../api --alias=api
shipstate workspace add ../web --alias=web
shipstate workspace depend api:API-017 web:WEB-031
shipstate workspace status
shipstate hub
```

Developer execution can be delegated to an authorized SSH host:

```bash
shipstate run TASK-001 --agent=claude --remote=user@host
shipstate start --remote=user@host
shipstate remote doctor user@host
```

SHIPSTATE creates a temporary remote workspace, synchronizes the isolated worktree, executes with heartbeat/timeout/cancellation/logging, synchronizes the result back, cleans the remote workspace and then performs authoritative verification locally.

## Observability

Useful commands:

```bash
shipstate status
shipstate providers
shipstate analytics
shipstate history TASK-001
shipstate hub
```

The local dashboard adds an **Intelligence** view for ProjectTruth counts, provider detection/ROI, quality state, Repair Episodes and token-economy telemetry.

## Certification boundary

CI can certify the provider-free deterministic kernel and all mocked/fallback behaviors across the platform matrix. Real authenticated Claude/Codex execution remains a host-specific certification:

```bash
shipstate certify-team
```

No provider credential is required for SHIPSTATE's core lifecycle, state integrity, verification or fallback operation.
