import { id, now } from './core.js';
import { acceptCandidate, removeWorktree } from './git.js';
import { readState, recordDecision, transition, updateRun } from './store.js';

function currentRun(task, state) {
  if (task.lastRunId) return state.runs.find((run) => run.id === task.lastRunId);
  return [...state.runs].reverse().find((run) => run.taskId === task.id);
}

export function acceptTask(taskId, root = process.cwd()) {
  let state = readState(root);
  let task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  if (task.state !== 'VERIFIED') throw new Error(`Task ${taskId} must be VERIFIED before acceptance (is ${task.state})`);
  const run = currentRun(task, state);
  if (!run) throw new Error(`Task ${taskId} has no run to accept`);

  transition(taskId, 'ACCEPTING', {}, root);
  try {
    const result = acceptCandidate(run.candidateCommit, run.baseCommit, root);
    recordDecision({ id: id('decision'), taskId, runId: run.id, action: 'accept', at: now(), result }, root);
    updateRun(run.id, { acceptedAt: now(), acceptedCommit: result.commit, status: 'accepted' }, root);
    transition(taskId, 'ACCEPTED', { acceptedAt: now(), acceptedCommit: result.commit }, root);
    if (run.worktreePath) removeWorktree(run.worktreePath, root);
    return { taskId, ...result };
  } catch (error) {
    transition(taskId, 'VERIFIED', { acceptanceError: error.message }, root);
    throw error;
  }
}

export function rejectTask(taskId, reason = 'rejected_by_user', root = process.cwd()) {
  const state = readState(root);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  if (!['IMPLEMENTED','VERIFIED','FAILED','BLOCKED'].includes(task.state)) throw new Error(`Task ${taskId} cannot be rejected from ${task.state}`);
  const run = currentRun(task, state);
  transition(taskId, 'REJECTED', { rejectionReason: reason, rejectedAt: now() }, root);
  recordDecision({ id: id('decision'), taskId, runId: run?.id ?? null, action: 'reject', reason, at: now() }, root);
  if (run?.worktreePath) {
    removeWorktree(run.worktreePath, root);
    updateRun(run.id, { rejectedAt: now(), status: 'rejected' }, root);
  }
  return { taskId, rejected: true };
}

export function unblockTask(taskId, root = process.cwd()) {
  const state = readState(root);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  if (task.state !== 'BLOCKED') throw new Error(`Task ${taskId} is not BLOCKED`);
  transition(taskId, 'READY', { blockedReason: null }, root);
  recordDecision({ id: id('decision'), taskId, action: 'unblock', at: now() }, root);
  return { taskId, unblocked: true };
}
