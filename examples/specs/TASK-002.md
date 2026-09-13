# Demonstrate dependency-aware next action
Id: TASK-002
Depends On: TASK-001
Priority: 90

## Objective
Demonstrate that dependent work stays ineligible until its prerequisite is verified.

## Acceptance Criteria
- TASK-002 is not selected while TASK-001 is unverified.

## Verification
- npm test
