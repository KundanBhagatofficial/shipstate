# Task Contracts

SHIPSTATE tasks are Markdown because they are easy for humans and agents to inspect, diff and generate.

```markdown
# Restore session before API boot

ID: AUTH-004
Priority: 90
Depends On: DB-002
Tags: auth, boot
Requirement: AUTH-SESSION

## Objective
Restore an existing user session before any authenticated API request can start.

## Acceptance Criteria
- Valid persisted session is restored during bootstrap
- Invalid refresh token clears persisted authentication
- API client cannot start before restoration completes

## Verification
- npm test -- auth
- npm run typecheck

## Files
- src/auth/session.ts
- src/bootstrap.ts

## Allowed Paths
- src/auth/**
- src/bootstrap.ts
- test/auth/**

## Protected Paths
- migrations/**
```

### Fields

`ID` must be unique. `Depends On` is a comma-separated task list. Dependencies must exist and cycles are rejected. Higher `Priority` is selected first among otherwise eligible work.

`Files` are explicit high-value context inputs. The context compiler also performs lightweight lexical repository discovery.

`Allowed Paths` restricts the agent's diff. If omitted, every non-protected path is available. `Protected Paths` extends project/default protection.

`Verification` is mandatory for a task to reach `VERIFIED`.
