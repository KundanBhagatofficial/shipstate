import { createHash, randomUUID } from 'node:crypto';

export const SCHEMA_VERSION = 2;
export const TASK_STATES = Object.freeze([
  'PENDING','READY','RUNNING','IMPLEMENTED','VERIFYING','VERIFIED','ACCEPTING','ACCEPTED','FAILED','BLOCKED','REJECTED'
]);

const ALLOWED = Object.freeze({
  PENDING: ['READY','BLOCKED','REJECTED'],
  READY: ['RUNNING','BLOCKED','REJECTED'],
  RUNNING: ['IMPLEMENTED','FAILED','BLOCKED'],
  IMPLEMENTED: ['VERIFYING','READY','BLOCKED','REJECTED'],
  VERIFYING: ['VERIFIED','FAILED','BLOCKED'],
  VERIFIED: ['ACCEPTING','READY','REJECTED'],
  ACCEPTING: ['ACCEPTED','VERIFIED','FAILED'],
  ACCEPTED: [],
  FAILED: ['READY','BLOCKED','REJECTED'],
  BLOCKED: ['READY','REJECTED'],
  REJECTED: ['READY']
});

export function now() { return new Date().toISOString(); }
export function id(prefix) { return `${prefix}-${randomUUID().slice(0, 8)}`; }
export function hash(value) { return createHash('sha256').update(value).digest('hex'); }

export function assertTransition(from, to) {
  if (!TASK_STATES.includes(from) || !TASK_STATES.includes(to) || !ALLOWED[from]?.includes(to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }
}

export function dependencySatisfied(dep) {
  return dep?.state === 'ACCEPTED';
}

export function eligible(task, tasksById) {
  if (!['PENDING','READY','FAILED','REJECTED'].includes(task.state)) return false;
  return (task.dependsOn ?? []).every((depId) => dependencySatisfied(tasksById[depId]));
}

export function chooseNext(tasks) {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  return tasks
    .filter((t) => eligible(t, byId))
    .sort((a,b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))[0] ?? null;
}

export function summarizeTasks(tasks) {
  const counts = Object.fromEntries(TASK_STATES.map((s) => [s, 0]));
  for (const task of tasks) counts[task.state] = (counts[task.state] ?? 0) + 1;
  return counts;
}

export function readiness(tasks) {
  if (!tasks.length) return 0;
  const accepted = tasks.filter((t) => t.state === 'ACCEPTED').length;
  return Math.round((accepted / tasks.length) * 100);
}
