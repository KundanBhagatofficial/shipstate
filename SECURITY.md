# Security Model

SHIPSTATE executes tools capable of changing source code and, when explicitly authorized, deployment environments. The security boundary is therefore explicit.

## Project authority boundary

The project owner controls canonical product truth through `shipstate.project.json` and `docs/shipstate/**`. Autonomous development cannot start until the deterministic handover audit passes and the owner accepts the committed contract.

After acceptance:

- SHIPSTATE stores a hash of the full handover contract.
- `shipstate.project.json` and `docs/shipstate/**` are protected paths for implementation agents.
- A later manual change invalidates the handover hash and autonomous execution refuses to resume until re-audited and reaccepted.
- Codex may propose tasks, repairs and replans but cannot change approved project authority or directly create VERIFIED/ACCEPTED/DELIVERED state.
- Claude may modify only its bounded implementation worktree and cannot approve itself.
- Material undelegated choices become persisted owner-decision gates rather than implicit AI assumptions.

## Execution

- Every implementation attempt gets a detached Git worktree at an exact base commit.
- Linux uses Bubblewrap when available. macOS uses `sandbox-exec` when available. Unsupported hosts fall back to worktree/path-policy isolation and report that reduced level as evidence.
- Linux resource limits use `prlimit` when available. Command runs support wall-clock timeouts and process-tree termination.
- Claude/Codex network access is enabled where their hosted CLIs require it; task policy can disable network for local/offline agents.
- Environment variables are scrubbed to a minimal allowlist before agent execution.
- Codex manager/reviewer roles execute in a SHIPSTATE-owned control directory rather than a developer worktree; project source is intended to be inspected read-only from that role.
- On macOS, Claude Code subscription/OAuth authentication may be stored in the login Keychain. Keychain access is granted only to the Claude adapter when host authentication has already been confirmed and is recorded in sandbox metadata.

## Repository policy

Always protected:

- `.git/**`
- `.shipstate/**`
- `.env`, `.env.*`, `**/.env*`
- accepted project control paths (`shipstate.project.json`, `docs/shipstate/**`)

Allowed/protected task paths and Design Locks are enforced before verification. Candidate code is committed only after deterministic verification. Acceptance requires a clean main tree and the same base HEAD; stale candidates are refused.

## Structured manager/reviewer output

Codex role output is parsed as a constrained JSON decision contract. AI-generated task graphs are validated before import: unknown dependencies, duplicate IDs and cycles are rejected. Structured output is still untrusted model output; SHIPSTATE state transitions, path policy and verification remain authoritative.

## Deployment

Deployment is disabled from autonomous execution unless the project authority contract permits it. `owner_gate` requires an explicit persisted owner authorization. `automatic` requires configured deploy and production-smoke commands before handover can pass. Deployment/smoke/rollback commands are trusted executable project configuration and should be reviewed before handover acceptance.

If a configured production smoke fails, SHIPSTATE records the failure and attempts configured rollback commands when present. It does not silently declare delivery successful.

## Local dashboard

- Binds to `127.0.0.1` by default.
- Mutations require a random per-process token.
- The token is delivered in the launch URL fragment and stored in browser session storage.

## Trusted inputs

Task verification commands and delivery/build/deploy/smoke/rollback commands are executable shell commands. Project documents, task specs and authority configuration should come from the project owner or another trusted source before approval.

## No secrets / telemetry

SHIPSTATE includes no analytics SDK, hosted database, remote telemetry, cloud secret store, or mandatory account. Claude/Codex/GitHub/SSH authentication remains external to the SHIPSTATE state store.
