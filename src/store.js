import fs from 'node:fs';
import path from 'node:path';
import { id, now, assertTransition, SCHEMA_VERSION } from './core.js';

const DIR = '.shipstate';

export function paths(root = process.cwd()) {
  const base = path.join(root, DIR);
  return {
    base,
    state: path.join(base, 'state.json'),
    events: path.join(base, 'events.jsonl'),
    config: path.join(base, 'config.json'),
    runs: path.join(base, 'runs'),
    contexts: path.join(base, 'contexts'),
    artifacts: path.join(base, 'artifacts'),
    worktrees: path.join(base, 'worktrees'),
    backups: path.join(base, 'backups')
  };
}

export function initialized(root = process.cwd()) { return fs.existsSync(paths(root).state); }

function baseState(root) {
  return {
    schemaVersion: SCHEMA_VERSION,
    project: { id: id('project'), name: path.basename(root), root: path.resolve(root), createdAt: now() },
    tasks: [],
    evidence: [],
    runs: [],
    decisions: []
  };
}

function baseConfig() {
  return {
    defaultAgent: 'dry-run',
    maxContextBytes: 120000,
    server: { host: '127.0.0.1', port: 4317 },
    policy: { allowedPaths: [], protectedPaths: [] }
  };
}

export function initStore(root = process.cwd(), options = {}) {
  const p = paths(root);
  for (const dir of [p.base,p.runs,p.contexts,p.artifacts,p.worktrees,p.backups]) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(p.state)) {
    const state = baseState(root);
    if (options.name) state.project.name = options.name;
    writeState(state, root);
  }
  if (!fs.existsSync(p.config)) atomicWriteJson(p.config, baseConfig());
  if (!fs.existsSync(p.events)) fs.writeFileSync(p.events, '');
  appendEvent('PROJECT_INITIALIZED', { root: path.resolve(root) }, root);
  return readState(root);
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temp, file);
}

function migrateState(state, root) {
  let changed = false;
  if (!state.schemaVersion) {
    state.schemaVersion = 1;
    state.decisions ??= [];
    changed = true;
  }
  if (state.schemaVersion === 1) {
    for (const task of state.tasks ?? []) {
      if (task.state === 'VERIFIED' && !task.acceptedAt) task.state = 'ACCEPTED';
    }
    state.schemaVersion = 2;
    state.project.root ??= path.resolve(root);
    changed = true;
  }
  return { state, changed };
}

export function readState(root = process.cwd()) {
  const p = paths(root);
  const raw = JSON.parse(fs.readFileSync(p.state, 'utf8'));
  const { state, changed } = migrateState(raw, root);
  if (changed) writeState(state, root);
  return state;
}

export function writeState(state, root = process.cwd()) {
  state.schemaVersion = SCHEMA_VERSION;
  atomicWriteJson(paths(root).state, state);
}

export function readConfig(root = process.cwd()) {
  const p = paths(root);
  if (!fs.existsSync(p.config)) atomicWriteJson(p.config, baseConfig());
  return { ...baseConfig(), ...JSON.parse(fs.readFileSync(p.config, 'utf8')) };
}

export function writeConfig(config, root = process.cwd()) {
  atomicWriteJson(paths(root).config, { ...baseConfig(), ...config });
  appendEvent('CONFIG_UPDATED', {}, root);
}

export function appendEvent(type, payload = {}, root = process.cwd()) {
  const event = { id: id('evt'), type, at: now(), payload };
  fs.mkdirSync(paths(root).base, { recursive: true });
  fs.appendFileSync(paths(root).events, `${JSON.stringify(event)}\n`);
  return event;
}

export function readEvents(root = process.cwd(), limit = 200) {
  const file = paths(root).events;
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).slice(-limit).map((line) => JSON.parse(line));
}

export function addTasks(tasks, root = process.cwd()) {
  const state = readState(root);
  const existing = new Set(state.tasks.map((t) => t.id));
  for (const task of tasks) {
    if (existing.has(task.id)) throw new Error(`Duplicate task: ${task.id}`);
    state.tasks.push(task);
    existing.add(task.id);
  }
  validateDependencies(state.tasks);
  for (const task of tasks) appendEvent('TASK_IMPORTED', { taskId: task.id, source: task.source }, root);
  writeState(state, root);
  return state;
}

export function upsertTasks(tasks, root = process.cwd()) {
  const state = readState(root);
  const byId = new Map(state.tasks.map((t, index) => [t.id, index]));
  const events = [];
  for (const task of tasks) {
    const index = byId.get(task.id);
    if (index === undefined) {
      state.tasks.push(task);
      byId.set(task.id, state.tasks.length - 1);
      events.push(['TASK_IMPORTED', { taskId: task.id, source: task.source }]);
    } else {
      const current = state.tasks[index];
      if (!['PENDING','READY','FAILED','BLOCKED','REJECTED'].includes(current.state)) throw new Error(`Cannot update active/completed task ${task.id}`);
      state.tasks[index] = { ...task, state: current.state, createdAt: current.createdAt, updatedAt: now() };
      events.push(['TASK_UPDATED', { taskId: task.id, source: task.source }]);
    }
  }
  validateDependencies(state.tasks);
  for (const [type, payload] of events) appendEvent(type, payload, root);
  writeState(state, root);
  return state;
}

export function validateDependencies(tasks) {
  const ids = new Set(tasks.map((t) => t.id));
  for (const task of tasks) {
    for (const dep of task.dependsOn ?? []) if (!ids.has(dep)) throw new Error(`Task ${task.id} depends on unknown task ${dep}`);
  }
  const visiting = new Set();
  const visited = new Set();
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  function visit(idValue) {
    if (visiting.has(idValue)) throw new Error(`Task dependency cycle detected at ${idValue}`);
    if (visited.has(idValue)) return;
    visiting.add(idValue);
    for (const dep of byId[idValue]?.dependsOn ?? []) visit(dep);
    visiting.delete(idValue);
    visited.add(idValue);
  }
  for (const task of tasks) visit(task.id);
}

export function transition(taskId, to, meta = {}, root = process.cwd()) {
  const state = readState(root);
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  assertTransition(task.state, to);
  const from = task.state;
  task.state = to;
  task.updatedAt = now();
  Object.assign(task, meta);
  appendEvent('TASK_TRANSITION', { taskId, from, to, meta }, root);
  writeState(state, root);
  return task;
}

export function recoverTransition(taskId, to, reason, root = process.cwd()) {
  const state = readState(root);
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  const from = task.state;
  task.state = to;
  task.updatedAt = now();
  appendEvent('TASK_RECOVERED', { taskId, from, to, reason }, root);
  writeState(state, root);
  return task;
}

export function recordRun(run, root = process.cwd()) {
  const state = readState(root);
  state.runs.push(run);
  appendEvent('RUN_RECORDED', { runId: run.id, taskId: run.taskId, status: run.status, agent: run.agent }, root);
  writeState(state, root);
  return run;
}

export function updateRun(runId, patch, root = process.cwd()) {
  const state = readState(root);
  const run = state.runs.find((r) => r.id === runId);
  if (!run) throw new Error(`Unknown run: ${runId}`);
  Object.assign(run, patch, { updatedAt: now() });
  appendEvent('RUN_UPDATED', { runId, patch }, root);
  writeState(state, root);
  return run;
}

export function recordEvidence(items, root = process.cwd()) {
  if (!items?.length) return [];
  const state = readState(root);
  state.evidence.push(...items);
  for (const item of items) appendEvent('EVIDENCE_RECORDED', { evidenceId: item.id, taskId: item.taskId, type: item.type, status: item.status }, root);
  writeState(state, root);
  return items;
}

export function recordDecision(decision, root = process.cwd()) {
  const state = readState(root);
  state.decisions.push(decision);
  appendEvent('DECISION_RECORDED', { decisionId: decision.id, taskId: decision.taskId, action: decision.action }, root);
  writeState(state, root);
  return decision;
}

export function taskById(taskId, root = process.cwd()) {
  const task = readState(root).tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  return task;
}
