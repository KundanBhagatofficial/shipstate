# Security Model

SHIPSTATE executes tools capable of changing source code, so the boundary is explicit.

## Execution
- Every implementation attempt gets a detached Git worktree at an exact base commit.
- Linux uses Bubblewrap when available. macOS uses `sandbox-exec` when available. Unsupported hosts fall back to worktree/path-policy isolation and report that reduced level as evidence.
- Linux resource limits use `prlimit` when available. All command runs support wall-clock timeout and process-tree termination.
- Claude/Codex network access is enabled by default because their hosted CLIs require it; task contracts can explicitly set `Network: false` for local/offline agents.
- Environment variables are scrubbed to a minimal allowlist before agent execution.
- On macOS, Claude Code subscription/OAuth authentication may be stored in the login Keychain. SHIPSTATE grants Keychain IPC/file access only to the Claude adapter when host authentication has already been confirmed. That grant is recorded in run sandbox metadata as `keychainAccess: true`; ordinary commands and other agents do not receive it.

## Repository policy
- `.git/**`, `.shipstate/**`, `.env`, `.env.*` are always protected.
- Allowed/protected task paths are enforced before verification.
- Design Locks may additionally protect architecture-sensitive paths.
- Candidate code is committed only after deterministic verification.
- Acceptance requires a clean main tree and the same base `HEAD`; stale candidates are refused.

## Local dashboard
- Binds to `127.0.0.1` by default.
- Mutations require a random per-process token.
- The token is placed only in the launch URL fragment and then stored in browser session storage.

## Trusted inputs
Verification commands from task contracts are executable shell commands. Review imported task/spec documents before approval.

## No secrets/telemetry
SHIPSTATE includes no analytics SDK, hosted database, remote telemetry, cloud secret store, or mandatory account.
