#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { acceptTask, rejectTask, unblockTask } from './actions.js';
import { compileContext } from './context.js';
import { chooseNext } from './core.js';
import { doctor } from './doctor.js';
import { recover } from './recovery.js';
import { runTask } from './runner.js';
import { startServer } from './server.js';
import { loadTaskFiles, taskTemplate } from './spec.js';
import { projectStatus } from './status.js';
import { addTasks, initStore, initialized, paths, readConfig, readState, upsertTasks } from './store.js';
import { verifyTask } from './verifier.js';

const argv = process.argv.slice(2);
const cmd = argv[0];
const args = argv.slice(1);

function flag(name, fallback = null) {
  const prefixed = args.find((arg) => arg.startsWith(`--${name}=`));
  if (prefixed) return prefixed.slice(name.length + 3);
  return args.includes(`--${name}`) ? true : fallback;
}
function positional(index = 0) { return args.filter((arg) => !arg.startsWith('--'))[index]; }
function needInit() { if (!initialized()) throw new Error('Not initialized. Run: shipstate init'); }
function task(id) { needInit(); const value = readState().tasks.find((item) => item.id === id); if (!value) throw new Error(`Unknown task: ${id}`); return value; }
function ensureIgnored(root = process.cwd()) {
  const file = path.join(root, '.gitignore');
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!content.split(/\r?\n/).some((line) => line.trim() === '.shipstate/' || line.trim() === '.shipstate')) fs.appendFileSync(file, `${content && !content.endsWith('\n') ? '\n' : ''}.shipstate/\n`);
}
function json(value) { console.log(JSON.stringify(value, null, 2)); }
function printStatus(status = projectStatus()) {
  console.log(`\nSHIPSTATE — ${status.project.name}`);
  console.log(`${String(status.readiness).padStart(3)}% release readiness`);
  console.log('─'.repeat(44));
  for (const [state, count] of Object.entries(status.counts)) if (count) console.log(`${state.padEnd(14)} ${count}`);
  console.log('─'.repeat(44));
  console.log(`Next: ${status.next ? `${status.next.id} — ${status.next.title}` : 'none'}`);
  if (status.blockers.length) console.log(`Blocked: ${status.blockers.map((item) => item.id).join(', ')}`);
  if (status.git.repository) console.log(`Git: ${status.git.branch || 'detached'} @ ${status.git.head.slice(0,7)} · ${status.git.clean ? 'clean' : 'dirty'}`);
  console.log('');
}
function openBrowser(url) {
  const command = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c','start','',url]] : ['xdg-open', [url]];
  const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' });
  child.on('error', () => {}); child.unref();
}

async function main() {
  if (cmd === 'init') {
    const state = initStore(process.cwd(), { name: flag('name') || undefined });
    ensureIgnored();
    console.log(`Initialized ${state.project.name} in ${paths().base}`);
    return;
  }
  if (cmd === 'template') { console.log(taskTemplate(positional(0) || 'TASK-001', positional(1) || 'Describe the task')); return; }
  if (cmd === 'doctor') { for (const item of doctor()) console.log(`${item.available ? '✓' : item.required ? '✗' : '○'} ${item.name.padEnd(12)} ${item.version ?? 'not found'}${item.required ? ' [required]' : ' [optional]'}`); return; }
  needInit();
  if (cmd === 'import') {
    const target = positional(0); if (!target) throw new Error('Usage: shipstate import <file-or-directory> [--upsert]');
    const tasks = loadTaskFiles(path.resolve(target));
    flag('upsert') ? upsertTasks(tasks) : addTasks(tasks);
    console.log(`Imported ${tasks.length} task(s)`); return;
  }
  if (cmd === 'status') { flag('json') ? json(projectStatus()) : printStatus(); return; }
  if (cmd === 'next') { const next = chooseNext(readState().tasks); next ? json(next) : console.log('No eligible task.'); return; }
  if (cmd === 'context') { const value = task(positional(0)); json(compileContext(value.id)); return; }
  if (cmd === 'run') { const value = task(positional(0)); json(runTask(value.id, flag('agent', readConfig().defaultAgent))); return; }
  if (cmd === 'verify') { const value = task(positional(0)); json(verifyTask(value.id)); return; }
  if (cmd === 'accept') { const value = task(positional(0)); json(acceptTask(value.id)); return; }
  if (cmd === 'reject') { const value = task(positional(0)); json(rejectTask(value.id, flag('reason', 'rejected_from_cli'))); return; }
  if (cmd === 'unblock') { const value = task(positional(0)); json(unblockTask(value.id)); return; }
  if (cmd === 'history') { const value = task(positional(0)); const state = readState(); json({ runs: state.runs.filter((run) => run.taskId === value.id), evidence: state.evidence.filter((item) => item.taskId === value.id), decisions: state.decisions.filter((item) => item.taskId === value.id) }); return; }
  if (cmd === 'recover') { json(recover(process.cwd(), { prune: Boolean(flag('prune')) })); return; }
  if (cmd === 'serve') {
    const requestedPort = Number(flag('port', readConfig().server.port));
    const started = await startServer(process.cwd(), { port: requestedPort });
    console.log(`SHIPSTATE dashboard: ${started.url}`);
    console.log('Press Ctrl+C to stop.');
    if (flag('open')) openBrowser(started.url);
    return;
  }
  if (cmd === 'demo') { printStatus(); return; }
  console.log(`SHIPSTATE 0.2 RC\n\nCommands:\n  init [--name=NAME]\n  template [TASK-ID] [TITLE]\n  import <file|dir> [--upsert]\n  status [--json]\n  next\n  context <TASK>\n  run <TASK> [--agent=manual|dry-run|claude|codex]\n  verify <TASK>\n  accept <TASK>\n  reject <TASK> [--reason=TEXT]\n  unblock <TASK>\n  history <TASK>\n  recover [--prune]\n  doctor\n  serve [--port=4317] [--open]\n  demo`);
}

main().catch((error) => { console.error(`shipstate: ${error.message}`); process.exitCode = 1; });
