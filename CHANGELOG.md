# Changelog

## 1.2.0
- stable promotion of the 1.2 release candidate after post-merge adversarial validation and zero-issue repair loop
- replay/state hardening: idempotent initialization, replayable task/delivery/handover/owner-gate mutations, fail-closed malformed/tampered journals and protected last-good snapshots
- real Design Lock glob enforcement, crash-safe acceptance/recovery, and safe path-disjoint parallel candidate integration with post-integration verification/rollback
- quality certification now fails closed for required dimensions, with corrected platform inference and deterministic security-evidence reuse
- hard final context-token budgets for both routed and legacy context compilers
- provider hardening with sanitized bounded subprocesses, disposable read-only projections, source-mutation detection, cache-only persistence and dashboard health-probe caching
- bounded runtime output and termination escalation plus deterministic SSH/rsync control timeouts
- real finishProject end-to-end coverage for release/deployment owner gates, production smoke and rollback success/failure
- Claude remains the preferred developer; Codex is the bounded automatic fallback for quota/auth/provider/writeability outages before source changes
- provider failover is journaled, does not consume a repair cycle, and automatically probes/fails back to Claude after the configured cooldown
- Claude developer execution is non-interactive inside the isolated worktree; Codex manager/reviewer stays read-only and Codex developer fallback receives workspace-write only
- certification commands return non-zero when structured certification fails; retry execution clears stale failure metadata
- live authenticated certification proved both the preferred Claude path and real Claude session-limit -> Codex same-task fallback path
- deterministic compiled ProjectTruth with stable requirement/decision/quality fact IDs and canonical-document provenance
- Project Contract v2 and state schema v5 with backward migration from prior autonomous-delivery state
- Context Router 3 with hard token budgets, ProjectTruth selection, structural/semantic/UI provider routing, exact source selection and per-task context receipts
- measurable token economy: actual context tokens, estimated naive context, tokens avoided, provider latency and selected provider history
- generic read-only capability-provider kernel; optional providers cannot mutate SHIPSTATE state or override ProjectTruth/Design Locks
- built-in SHIPSTATE-lite structural provider retained as the zero-dependency fallback
- optional code-review-graph structural/impact/architecture provider with per-repository/per-commit graph isolation
- adaptive provider selection using repository/task characteristics plus confidence-weighted measured ROI from token savings, latency and failure history
- optional CodeAtlas, UI/UX Pro Max, GameForge and GEO/discoverability provider boundaries with fallback behavior
- provider hardening: sanitized command environments, bounded output, timeouts, serializability checks and sequential fallback
- systematic repair engine: failure classification, root-cause hypothesis, minimal repair contract, regression-test policy and persisted Repair Episodes
- automatic manager replan after repair exhaustion before an owner decision gate is created
- web/SaaS/iOS/Android/cross-platform quality profiles and pre-handover UI advisory
- deterministic public-web discoverability certification for governed public surfaces
- release lifecycle now requires deterministic project certification plus required SHIPSTATE quality certification before RELEASE_CANDIDATE
- cross-repository task dependencies participate in eligibility instead of being display-only metadata
- global project Hub over the local SHIPSTATE registry
- remote developer execution over SSH/rsync with temporary remote workspaces, heartbeat, timeout/cancellation, log capture, artifact sync-back and local verification
- owner dashboard Intelligence surface for ProjectTruth, adaptive providers, quality expectations, repair history and token efficiency
- journal replay now preserves nested intelligence state across named intelligence events, including historical 1.2 event names
- CI certification remains Ubuntu/macOS/Windows × Node 20/22 with syntax, unit, smoke and end-to-end gates

## 1.1.0-rc.1
- project-level handover and autonomous delivery lifecycle
- uniform mandatory project pack: product, features, UX, frontend, architecture, data, security, development, testing, deployment, acceptance and decision ledger
- machine-readable `shipstate.project.json` authority contract
- mandatory owner decisions and deterministic handover audit before AI development can start
- accepted handover hash and protected project-control documents
- Codex project-manager preflight, roadmap planning, bounded task briefs, code review and completion review
- Claude developer role receiving manager briefs and reviewer repair context automatically
- SHIPSTATE-owned verification, candidate integration, project certification and delivery states
- structured JSON manager/reviewer contracts with task-DAG validation
- owner decision gates for undelegated decisions, repair exhaustion, release and deployment
- automatic repair/review/replan loop with bounded attempts
- compact recurring Codex context projections and role prompt-token metrics
- safe pause/resume behavior with cached preflight for unchanged handover truth
- project certification refreshes repository profile and requires deterministic certification commands
- authorized deployment, production-smoke evidence and optional rollback execution
- owner-centric dashboard: Delivery, Handover and Decisions as primary surfaces
- state schema v4 for handover, AI team, delivery lifecycle and owner-decision persistence
- provider-free handover/autonomous-contract tests plus retained cross-platform CI matrix

## 1.0.0-rc.1
- automatic project stack/framework/test/build profiling
- schema version 3, atomic last-good state, checksum event chain, legacy journal upgrade, replayable event recovery
- OS-aware execution sandbox and resource/timeout/cancel controls
- import/symbol/reverse-import/test/Git-aware Context Engine 2 with token metrics
- typed Evidence Engine 2
- parallel-safe task batch selection and autonomous execution loop
- Design Locks and product-document planning with explicit approval
- GitHub PR/check adapter via free `gh` CLI
- project registry, workspace support, SSH remote diagnostics, CodeAtlas/GameForge adapter contracts
- productized local dashboard with context/system/analytics surfaces
- real Claude/Codex certification harness
- Linux/macOS/Windows × Node 20/22 CI certification matrix

## 0.2.0-rc.1
- isolated worktree execution, verification, explicit acceptance, loop guard, recovery, dashboard
