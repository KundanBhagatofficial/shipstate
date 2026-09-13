import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hash, id, now } from './core.js';
import { createCandidateCommit, diffEvidence, listChangedFiles } from './git.js';
import { evaluateChangedFiles } from './policy.js';
import { readConfig, readState, recordEvidence, transition, updateRun } from './store.js';

function exec(command, root) {
  const result = spawnSync(command, { cwd: root, encoding: 'utf8', shell: true, timeout: 15 * 60 * 1000 });
  return { exitCode: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.message ?? null };
}

function latestRun(taskId, state) {
  return [...state.runs].reverse().find((run) => run.taskId === taskId && run.worktreePath);
}

export function verifyTask(taskId, root = process.cwd()) {
  let state = readState(root);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  if (task.state !== 'IMPLEMENTED') throw new Error(`Task ${taskId} must be IMPLEMENTED before verification (is ${task.state})`);
  const run = latestRun(taskId, state);
  if (!run) throw new Error(`Task ${taskId} has no isolated run to verify`);
  if (!fs.existsSync(run.worktreePath)) throw new Error(`Run worktree is missing: ${run.worktreePath}. Use shipstate recover.`);

  transition(taskId, 'VERIFYING', {}, root);
  const evidence = [];
  let passed = true;
  const commands = task.verification ?? [];
  if (!commands.length) {
    passed = false;
    evidence.push({ id: id('ev'), taskId, runId: run.id, type: 'policy', source: 'verification commands required', status: 'failed', createdAt: now() });
  }

  for (const command of commands) {
    const result = exec(command, run.worktreePath);
    const status = result.exitCode === 0 ? 'passed' : 'failed';
    if (status === 'failed') passed = false;
    evidence.push({
      id: id('ev'), taskId, runId: run.id, type: 'command', source: command, status,
      exitCode: result.exitCode,
      outputHash: hash(`${result.stdout}\n${result.stderr}`),
      outputPreview: `${result.stdout}${result.stderr}`.slice(-4000),
      createdAt: now()
    });
  }

  const changedFiles = listChangedFiles(run.worktreePath);
  const policy = evaluateChangedFiles(changedFiles, task, readConfig(root).policy);
  if (!policy.ok) passed = false;
  evidence.push({ id: id('ev'), taskId, runId: run.id, type: 'policy', source: 'changed-files', status: policy.ok ? 'passed' : 'failed', detail: policy, createdAt: now() });

  const diff = diffEvidence(run.worktreePath);
  evidence.push({ id: id('ev'), taskId, runId: run.id, type: 'diff', source: 'git diff HEAD', status: 'recorded', diffHash: diff.hash, bytes: diff.bytes, summary: diff.summary, createdAt: now() });
  recordEvidence(evidence, root);

  if (!passed) {
    const failureOutput = evidence.filter((item) => item.status === 'failed').map((item) => `${item.source}:${item.outputHash ?? JSON.stringify(item.detail ?? '')}`).join('|');
    const failureFingerprint = hash(failureOutput).slice(0, 12);
    updateRun(run.id, { status: 'verification_failed', verificationCompletedAt: now(), failureFingerprint, changedFiles, policy, diffHash: diff.hash }, root);
    const repeats = readState(root).runs.filter((item) => item.taskId === taskId && item.failureFingerprint === failureFingerprint).length;
    const blocked = !policy.ok || repeats >= 3;
    transition(taskId, blocked ? 'BLOCKED' : 'FAILED', { blockedReason: !policy.ok ? 'policy_violation' : repeats >= 3 ? 'repeated_failure' : null }, root);
    return { passed: false, evidence, run: readState(root).runs.find((item) => item.id === run.id) };
  }

  const candidate = createCandidateCommit(taskId, run.worktreePath);
  updateRun(run.id, {
    status: 'verified', verificationCompletedAt: now(), changedFiles, policy,
    diffHash: diff.hash, diffBytes: diff.bytes, candidateCommit: candidate.commit, emptyCandidate: candidate.empty
  }, root);
  transition(taskId, 'VERIFIED', { verifiedAt: now(), candidateCommit: candidate.commit, lastRunId: run.id }, root);
  return { passed: true, evidence, candidate, run: readState(root).runs.find((item) => item.id === run.id) };
}
