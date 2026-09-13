# Security Model

SHIPSTATE executes tools that can modify source code. Its security boundary is therefore explicit.

## Defaults

- The dashboard binds to `127.0.0.1`, not all interfaces.
- API mutations require a random token created for the current server process.
- Agent execution happens in detached Git worktrees.
- `.git/**`, `.shipstate/**`, `.env`, and `.env.*` are protected paths.
- Verification and acceptance are SHIPSTATE-owned transitions.
- Acceptance requires a clean main working tree and unchanged base `HEAD`.
- No secrets, telemetry, remote database, analytics SDK, or hosted control plane are included.

## Trust assumptions

Verification commands in task contracts are executable shell commands. Import task contracts only from sources you trust or review them before execution.

Claude/Codex adapters invoke executables already installed on the local machine. Their own authentication, network behavior and terms are outside SHIPSTATE.

## Reporting

For security issues, open a private security advisory on the GitHub repository rather than publishing exploit details in a public issue.
