# Add a project health endpoint

ID: TASK-001
Priority: 100
Tags: example, backend

## Objective
Add a tiny project-health module that exposes an explicit healthy status without changing unrelated behavior.

## Acceptance Criteria
- A health module exists
- The health result is deterministic
- Tests pass

## Verification
- npm test

## Files
- src/status.js

## Allowed Paths
- src/**
- test/**
