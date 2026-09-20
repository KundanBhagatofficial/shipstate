# SHIPSTATE 1.1 Certification

## Automated certification

```bash
npm run certify
```

The gate runs syntax checks, the complete automated suite and a fresh-repository lifecycle smoke. GitHub Actions executes the same gate on Ubuntu, macOS and Windows under Node 20 and Node 22.

## Project-handover tests

Provider-free tests prove that autonomous development cannot begin until:

- every canonical project document exists
- every document has had its `SHIPSTATE:TODO` marker removed
- documents contain substantive project content
- all mandatory owner decisions are approved or explicitly permitted N/A
- project control files are committed and the governed Git tree is clean
- the accepted handover hash is recorded
- `shipstate.project.json` and `docs/shipstate/**` become protected implementation paths

The autonomous-plan tests also reject malformed agent output, unknown dependencies, duplicate task IDs, dependency cycles and self-dependencies. Owner-gate tests prove approval authorizes only the named gate and a replan resolution requests Codex replanning rather than granting unrelated authority.

## Real AI certification

Provider credentials are intentionally not embedded in GitHub CI. On a machine with authenticated local CLIs run:

```bash
shipstate certify-agent claude
shipstate certify-agent codex
```

These existing harnesses prove each adapter can execute a bounded change through SHIPSTATE. A full Project Handover run should additionally be dogfooded on a real repository because manager/reviewer quality depends on actual approved project documents and repository context.

## Autonomous-delivery acceptance test

For a real project:

1. Run `shipstate handover init`.
2. Complete all files under `docs/shipstate/` and `shipstate.project.json`.
3. Commit them.
4. Run `shipstate handover audit`; expect `ready: true`.
5. Run `shipstate handover accept`.
6. Start the dashboard and AI team.
7. Confirm Codex preflight/plan decisions appear in the decision ledger.
8. Confirm Claude work occurs only in detached worktrees.
9. Confirm deterministic verification executes before Codex review.
10. Confirm Codex APPROVE still requires SHIPSTATE acceptance before the real branch changes.
11. Trigger one owner decision and confirm the controller pauses rather than guessing.
12. Resolve it and resume; unchanged handover preflight should not be rerun.
13. Confirm final completion requires all tasks ACCEPTED plus deterministic project certification.
14. If deployment is authorized/configured, confirm deploy, production smoke and rollback evidence behavior.

## Adversarial checks

- edit `.env.local`, `shipstate.project.json`, or `docs/shipstate/**` from a developer worktree: verification must block
- edit outside Allowed Paths: verification must block
- change approved handover documents manually after acceptance: `shipstate start` must refuse until re-audited/reaccepted
- move main HEAD after verification: acceptance must refuse
- submit duplicate/cyclic/unknown-dependency Codex tasks: plan validation must refuse them
- interrupt RUNNING/VERIFYING/ACCEPTING: recovery must return to a resumable state
- corrupt `state.json`: last-good snapshot or journal replay must recover
- mutate dashboard without the session token: HTTP 403
- fail a developer/reviewer loop repeatedly: the affected path must produce an owner decision rather than loop forever
- pause an active delivery: the bounded current task may finish, then the controller must stop at the next safe task boundary
