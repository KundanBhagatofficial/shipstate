# Task Contracts

```markdown
# Restore session before API boot
Id: AUTH-042
Depends On: AUTH-011
Priority: 90
Risk: high
Network: true
Timeout: 900
Memory MB: 2048
CPU Seconds: 600

## Objective
Restore persisted session before authenticated API bootstrap.

## Acceptance Criteria
- No authenticated request occurs before restoration.

## Verification
- npm test
- npm run typecheck

## Files
- src/auth/session.ts
- test/auth/session.test.ts

## Allowed Paths
- src/auth/**
- test/auth/**

## Protected Paths
- migrations/**

## Evidence
- test
- typecheck
- diff
```

If Verification or Allowed Paths are omitted, SHIPSTATE can derive defaults from the detected project profile. Explicit task policy always wins.
