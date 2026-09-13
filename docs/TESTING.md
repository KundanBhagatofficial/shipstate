# Release Testing

## Automated certification

```bash
npm run certify
```

Expected result: syntax PASS, all tests PASS, smoke PASS.

## Manual no-subscription test

Use a disposable Git repository or a branch you are comfortable modifying.

1. Ensure `git status` is clean.
2. Run `shipstate init`.
3. Commit the `.gitignore` change if SHIPSTATE added one.
4. Create/import one task whose `Allowed Paths` is narrow and whose verification command is deterministic.
5. Run `shipstate serve --open` and confirm Now/Tasks/Runs/Evidence/System render.
6. Run the task using `manual` mode from the dashboard or CLI.
7. Open the returned `worktreePath` and modify an allowed file.
8. Confirm the original repository file is unchanged.
9. Verify the task. Confirm it reaches `VERIFIED` and evidence appears.
10. Accept the task. Confirm the real branch now contains the change and the task reaches `ACCEPTED`.

## Negative tests

- Change a file outside `Allowed Paths`: verification must block the task.
- Create `.env.local` in the worktree: policy must block the task.
- Move the main branch HEAD after verification but before acceptance: acceptance must refuse the candidate.
- Fail an identical agent attempt three times: task must become `BLOCKED`.
- Kill SHIPSTATE while a task is RUNNING/VERIFYING/ACCEPTING and run `shipstate recover`: it must return to a resumable state.
- POST to the local API without `X-Shipstate-Token`: response must be HTTP 403.

## Real-agent test

If a supported CLI is already available:

```bash
shipstate doctor
shipstate run TASK-001 --agent=claude
# or --agent=codex
shipstate verify TASK-001
shipstate accept TASK-001
```

No paid service is required to perform the manual-mode certification.
