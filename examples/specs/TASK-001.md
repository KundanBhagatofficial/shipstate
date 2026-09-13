# Establish project health command
Id: TASK-001
Priority: 100

## Objective
Create a project health command that proves the repository can execute its baseline verification.

## Acceptance Criteria
- Node test suite exits successfully.
- The task cannot become VERIFIED without running verification.

## Verification
- npm test

## Files
- package.json
