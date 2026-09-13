import { randomUUID, createHash } from 'node:crypto';

export const TASK_STATES = Object.freeze(['PENDING','READY','RUNNING','IMPLEMENTED','VERIFYING','VERIFIED','FAILED','BLOCKED']);

export function now() { return new Date().toISOString(); }
export function id(prefix) { return `${prefix}-${randomUUID().slice(0, 8)}`; }
export function hash(value) { return createHash('sha256').update(value).digest('hex'); }

export function assertTransition(from, to) {
  const allowed = {
    PENDING: ['READY','BLOCKED'], READY: ['RUNNING','BLOCKED'], RUNNING: ['IMPLEMENTED','FAILED','BLOCKED'],
    IMPLEMENTED: ['VERIFYING','READY','BLOCKED'], VERIFYING: ['VERIFIED','FAILED'], FAILED: ['READY','BLOCKED'],
    BLOCKED: ['READY'], VERIFIED: []
  };
  if (!TASK_STATES.includes(from) || !TASK_STATES.includes(to) || !allowed[from].includes(to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }
}

export function eligible(task, tasksById) {
  if (!['PENDING','READY','FAILED'].includes(task.state)) return false;
  return (task.dependsOn ?? []).every((dep) => tasksById[dep]?.state === 'VERIFIED');
}

export function chooseNext(tasks) {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  return tasks
    .filter((t) => eligible(t, byId))
    .sort((a,b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))[0] ?? null;
}
