# 1.0 Certification

## Automated
`npm run certify` runs syntax checks, the unit/integration suite and a fresh-repository lifecycle smoke.

GitHub Actions runs the same gate on Ubuntu, macOS and Windows with Node 20 and Node 22.

## Real agent certification
A real authenticated local CLI is intentionally not embedded in CI secrets. Run on a developer machine:

```bash
shipstate certify-agent claude
shipstate certify-agent codex
```

The harness creates a disposable Git repository, asks the real agent to make one bounded change, then performs SHIPSTATE verification and acceptance. A pass proves adapter invocation, context handoff, sandbox behavior, evidence and integration on that host.

## Adversarial checks
- edit `.env.local` from a worktree: verification must block
- edit outside Allowed Paths: verification must block
- move main HEAD after verification: acceptance must refuse
- interrupt RUNNING/VERIFYING/ACCEPTING: `shipstate recover` must restore a resumable state
- corrupt `state.json`: last-good snapshot or journal replay must recover
- mutate dashboard without token: HTTP 403
- use a task with an ACCEPTED dependency missing: it must not become eligible
- run independent path scopes in a parallel scheduler batch; overlapping scopes must not share a batch
