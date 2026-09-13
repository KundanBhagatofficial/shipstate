import fs from 'node:fs';
import { hash, id, now, eligible } from './core.js';
import { compileContext } from './context.js';
import { executeAgent } from './agents.js';
import { createTaskWorktree, isClean, listChangedFiles, removeWorktree } from './git.js';
import { evaluateChangedFiles } from './policy.js';
import { readConfig, readState, recordEvidence, recordRun, transition, updateRun } from './store.js';

function fingerprint(text) {
  const normalized = text.replace(/\b\d+\b/g, '#').replace(/[A-Fa-f0-9]{20,}/g, '<hash>').replace(/\s+/g, ' ').trim();
  return normalized ? hash(normalized).slice(0, 12) : null;
}

function repeatedFailures(taskId, failureFingerprint, root) {
  if (!failureFingerprint) return 0;
  return readState(root).runs.filter((run) => run.taskId === taskId && run.failureFingerprint === failureFingerprint).length;
}

export function runTask(taskId, agent = 'dry-run', root = process.cwd(), options = {}) {
  let state = readState(root);
  let task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  const byId = Object.fromEntries(state.tasks.map((item) => [item.id, item]));

  if (['PENDING','FAILED','REJECTED'].includes(task.state)) {
    if (!eligible(task, byId)) throw new Error(`Task ${taskId} is not eligible; all dependencies must be ACCEPTED`);
    if (task.state === 'FAILED') {
      const prior = [...state.runs].reverse().find((item) => item.taskId === taskId && item.worktreePath && !item.acceptedAt && !item.rejectedAt);
      if (prior?.worktreePath && fs.existsSync(prior.worktreePath)) {
        removeWorktree(prior.worktreePath, root);
        updateRun(prior.id, { worktreeRemovedAt: now(), cleanupReason: 'retry' }, root);
      }
    }
    transition(taskId, 'READY', {}, root);
    state = readState(root);
    task = state.tasks.find((item) => item.id === taskId);
  }
  if (task.state !== 'READY') throw new Error(`Task ${taskId} cannot run from ${task.state}`);
  if (!isClean(root)) throw new Error('Main working tree must be clean before starting an isolated agent run. Commit or stash your changes first.');

  const runId = id('run');
  const worktree = createTaskWorktree(taskId, runId, root);
  const context = compileContext(taskId, root, worktree.path);
  const run = {
    id: runId,
    taskId,
    agent,
    status: 'running',
    startedAt: now(),
    completedAt: null,
    exitCode: null,
    baseCommit: worktree.baseCommit,
    worktreePath: worktree.path,
    contextPath: context.path,
    contextHash: context.hash,
    contextBytes: context.bytes,
    contextFiles: context.files,
    changedFiles: [],
    policy: null,
    candidateCommit: null,
    failureFingerprint: null,
    stdout: '',
    stderr: ''
  };
  recordRun(run, root);
  transition(taskId, 'RUNNING', { lastRunId: runId, lastAgent: agent }, root);

  let result;
  try {
    result = executeAgent(agent, context.path, worktree.path, options);
  } catch (error) {
    result = { exitCode: 1, stdout: '', stderr: error.message, error: error.message };
  }

  const changedFiles = listChangedFiles(worktree.path);
  const policy = evaluateChangedFiles(changedFiles, task, readConfig(root).policy);
  const failureText = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
  const failureFingerprint = result.exitCode === 0 && policy.ok ? null : fingerprint(policy.ok ? failureText : JSON.stringify(policy.violations));
  const status = result.exitCode === 0 && policy.ok ? 'passed' : (policy.ok ? 'failed' : 'policy_failed');

  updateRun(runId, {
    status,
    completedAt: now(),
    exitCode: result.exitCode,
    changedFiles,
    policy,
    stdout: (result.stdout ?? '').slice(-50000),
    stderr: (result.stderr ?? '').slice(-50000),
    failureFingerprint
  }, root);

  if (!policy.ok) {
    recordEvidence([{
      id: id('ev'), taskId, runId, type: 'policy', source: 'changed-files', status: 'failed',
      detail: policy.violations, createdAt: now()
    }], root);
    transition(taskId, 'BLOCKED', { blockedReason: 'policy_violation', lastRunId: runId }, root);
    return readState(root).runs.find((item) => item.id === runId);
  }

  if (result.exitCode === 0) {
    transition(taskId, 'IMPLEMENTED', { lastRunId: runId }, root);
  } else {
    const repeats = repeatedFailures(taskId, failureFingerprint, root);
    transition(taskId, repeats >= 3 ? 'BLOCKED' : 'FAILED', {
      lastRunId: runId,
      blockedReason: repeats >= 3 ? 'repeated_failure' : null
    }, root);
  }
  return readState(root).runs.find((item) => item.id === runId);
}

export function discardRunWorktree(runId, root = process.cwd()) {
  const run = readState(root).runs.find((item) => item.id === runId);
  if (!run?.worktreePath || !fs.existsSync(run.worktreePath)) return false;
  removeWorktree(run.worktreePath, root);
  updateRun(runId, { worktreeRemovedAt: now() }, root);
  return true;
}
