import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { hash } from './core.js';
import { paths } from './store.js';

export function git(args, cwd, options = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false, ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

export function assertGitRepository(root = process.cwd()) {
  const result = git(['rev-parse', '--show-toplevel'], root);
  if (result.status !== 0) throw new Error('SHIPSTATE execution requires a Git repository. Run git init/commit first.');
  const top = path.resolve(result.stdout.trim());
  if (top !== path.resolve(root)) throw new Error(`Run SHIPSTATE from the Git repository root: ${top}`);
  return top;
}

export function currentHead(root = process.cwd()) {
  assertGitRepository(root);
  const result = git(['rev-parse', 'HEAD'], root);
  if (result.status !== 0) throw new Error('Git repository has no commit yet. Create an initial commit before running agents.');
  return result.stdout.trim();
}

export function currentBranch(root = process.cwd()) {
  const result = git(['branch', '--show-current'], root);
  return result.status === 0 ? result.stdout.trim() : '';
}

export function workingTreeStatus(root = process.cwd()) {
  const result = git(['status', '--porcelain=v1', '--untracked-files=all'], root);
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Unable to inspect Git status');
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

export function isClean(root = process.cwd()) { return workingTreeStatus(root).length === 0; }

export function createTaskWorktree(taskId, runId, root = process.cwd()) {
  const head = currentHead(root);
  const dir = path.join(paths(root).worktrees, `${taskId}-${runId}`);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const result = git(['worktree', 'add', '--detach', dir, head], root);
  if (result.status !== 0) throw new Error(`Unable to create Git worktree: ${result.stderr.trim()}`);
  return { path: dir, baseCommit: head };
}

export function listChangedFiles(worktree) {
  const result = git(['status', '--porcelain=v1', '--untracked-files=all'], worktree);
  if (result.status !== 0) throw new Error(`Unable to inspect worktree: ${result.stderr.trim()}`);
  return result.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const raw = line.slice(3).trim();
    const renameTarget = raw.includes(' -> ') ? raw.split(' -> ').at(-1) : raw;
    return renameTarget.replace(/^"|"$/g, '');
  });
}

export function diffText(worktree) {
  git(['add', '-N', '.'], worktree);
  const result = git(['diff', '--no-ext-diff', '--binary', 'HEAD'], worktree);
  git(['reset', '--quiet'], worktree);
  if (result.status !== 0) throw new Error(`Unable to calculate diff: ${result.stderr.trim()}`);
  return result.stdout;
}

export function diffSummary(worktree) {
  const result = git(['diff', '--stat', 'HEAD'], worktree);
  return result.status === 0 ? result.stdout.trim() : '';
}

export function createCandidateCommit(taskId, worktree) {
  let result = git(['add', '-A'], worktree);
  if (result.status !== 0) throw new Error(`Unable to stage candidate: ${result.stderr.trim()}`);
  const staged = git(['diff', '--cached', '--quiet'], worktree);
  if (staged.status === 0) return { commit: null, empty: true };
  result = git([
    '-c','user.name=SHIPSTATE',
    '-c','user.email=shipstate@local',
    'commit','-m',`shipstate(${taskId}): verified candidate`
  ], worktree);
  if (result.status !== 0) throw new Error(`Unable to create candidate commit: ${result.stderr.trim()}`);
  const commit = git(['rev-parse', 'HEAD'], worktree).stdout.trim();
  return { commit, empty: false };
}

export function acceptCandidate(commit, baseCommit, root = process.cwd()) {
  assertGitRepository(root);
  if (!isClean(root)) throw new Error('Main working tree must be clean before accepting a candidate. Commit or stash your changes first.');
  const head = currentHead(root);
  if (head !== baseCommit) throw new Error(`Repository HEAD moved since the run started (${baseCommit.slice(0,7)} -> ${head.slice(0,7)}). Re-run or manually reconcile the candidate.`);
  if (!commit) return { applied: false, commit: head, reason: 'empty_candidate' };
  const result = git(['cherry-pick', commit], root);
  if (result.status !== 0) {
    git(['cherry-pick', '--abort'], root);
    throw new Error(`Candidate could not be applied cleanly: ${result.stderr.trim()}`);
  }
  return { applied: true, commit: currentHead(root) };
}

export function removeWorktree(worktree, root = process.cwd()) {
  if (!worktree) return;
  const result = git(['worktree', 'remove', '--force', worktree], root);
  if (result.status !== 0 && fs.existsSync(worktree)) fs.rmSync(worktree, { recursive: true, force: true });
  git(['worktree', 'prune'], root);
}

export function gitInfo(root = process.cwd()) {
  try {
    return {
      repository: true,
      branch: currentBranch(root),
      head: currentHead(root),
      clean: isClean(root),
      changes: workingTreeStatus(root)
    };
  } catch (error) {
    return { repository: false, error: error.message };
  }
}

export function diffEvidence(worktree) {
  const text = diffText(worktree);
  return { hash: hash(text), bytes: Buffer.byteLength(text), summary: diffSummary(worktree), text };
}
