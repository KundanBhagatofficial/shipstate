import fs from 'node:fs';
import { now } from './core.js';
import { removeWorktree } from './git.js';
import { readState, recoverTransition, updateRun } from './store.js';

export function recover(root = process.cwd(), options = {}) {
  const state = readState(root);
  const actions = [];
  for (const task of state.tasks) {
    if (task.state === 'RUNNING') {
      recoverTransition(task.id, 'FAILED', 'interrupted_agent_run', root);
      actions.push({ taskId: task.id, from: 'RUNNING', to: 'FAILED' });
    } else if (task.state === 'VERIFYING') {
      recoverTransition(task.id, 'IMPLEMENTED', 'interrupted_verification', root);
      actions.push({ taskId: task.id, from: 'VERIFYING', to: 'IMPLEMENTED' });
    } else if (task.state === 'ACCEPTING') {
      recoverTransition(task.id, 'VERIFIED', 'interrupted_acceptance', root);
      actions.push({ taskId: task.id, from: 'ACCEPTING', to: 'VERIFIED' });
    }
  }
  if (options.prune) {
    const refreshed = readState(root);
    const activePaths = new Set(refreshed.runs.filter((run) => !run.acceptedAt && !run.rejectedAt).map((run) => run.worktreePath).filter(Boolean));
    for (const run of refreshed.runs) {
      if (!run.worktreePath || activePaths.has(run.worktreePath)) continue;
      if (fs.existsSync(run.worktreePath)) {
        removeWorktree(run.worktreePath, root);
        updateRun(run.id, { recoveredCleanupAt: now() }, root);
      }
    }
  }
  return actions;
}
