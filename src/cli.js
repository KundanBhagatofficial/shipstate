#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { initStore, initialized, readState, addTasks } from './store.js';
import { loadTaskFiles } from './spec.js';
import { chooseNext } from './core.js';
import { compileContext } from './context.js';
import { runTask } from './runner.js';
import { verifyTask } from './verifier.js';
import { doctor } from './doctor.js';

const [cmd,...args]=process.argv.slice(2);
function needInit(){if(!initialized()) throw new Error('Not initialized. Run: shipstate init');}
function task(id){needInit(); const t=readState().tasks.find(x=>x.id===id); if(!t) throw new Error(`Unknown task: ${id}`); return t;}
function printStatus(){ const s=readState(); const counts={}; for(const t of s.tasks) counts[t.state]=(counts[t.state]||0)+1; console.log(`SHIPSTATE — ${s.project.name}`); console.log(`Tasks: ${s.tasks.length}`); for(const [k,v] of Object.entries(counts).sort()) console.log(`${k.padEnd(12)} ${v}`); const n=chooseNext(s.tasks); console.log(`Next: ${n?`${n.id} — ${n.title}`:'none'}`); }
async function main(){
  if(cmd==='init'){ const s=initStore(); console.log(`Initialized ${s.project.name}`); return; }
  if(cmd==='import'){needInit(); const target=args[0]; if(!target) throw new Error('Usage: shipstate import <file-or-directory>'); const tasks=loadTaskFiles(path.resolve(target)); addTasks(tasks); console.log(`Imported ${tasks.length} task(s)`); return;}
  if(cmd==='status'){needInit(); printStatus(); return;}
  if(cmd==='next'){needInit(); const n=chooseNext(readState().tasks); if(!n){console.log('No eligible task.');return;} console.log(JSON.stringify(n,null,2)); return;}
  if(cmd==='context'){const t=task(args[0]); const c=compileContext(t.id); console.log(`${c.path}\n${c.bytes} bytes\nsha256:${c.hash}`);return;}
  if(cmd==='run'){const t=task(args[0]); const agent=(args.find(x=>x.startsWith('--agent='))||'--agent=dry-run').split('=')[1]; const r=runTask(t.id,agent); console.log(JSON.stringify(r,null,2));return;}
  if(cmd==='verify'){const t=task(args[0]); const r=verifyTask(t.id); console.log(r.passed?'VERIFIED':'FAILED'); return;}
  if(cmd==='history'){const t=task(args[0]); console.log(JSON.stringify(readState().runs.filter(r=>r.taskId===t.id),null,2));return;}
  if(cmd==='doctor'){for(const x of doctor()) console.log(`${x.available?'✓':'○'} ${x.name.padEnd(8)} ${x.available?x.version:'not found (optional)'}`);return;}
  if(cmd==='demo'){
    initStore(); const specDir=path.resolve('examples/specs'); if(!readState().tasks.length && fs.existsSync(specDir)) addTasks(loadTaskFiles(specDir)); printStatus(); return;
  }
  console.log(`SHIPSTATE 0.1 alpha\n\nCommands:\n  init\n  import <file|dir>\n  status\n  next\n  context <TASK>\n  run <TASK> [--agent=dry-run|claude|codex]\n  verify <TASK>\n  history <TASK>\n  doctor\n  demo`);
}
main().catch(e=>{console.error(`shipstate: ${e.message}`);process.exitCode=1;});
