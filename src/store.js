import fs from 'node:fs';
import path from 'node:path';
import { id, now, assertTransition } from './core.js';

const DIR = '.shipstate';
export function paths(root=process.cwd()) {
  const base = path.join(root, DIR);
  return { base, state: path.join(base,'state.json'), events: path.join(base,'events.jsonl'), runs:path.join(base,'runs'), contexts:path.join(base,'contexts') };
}
export function initialized(root=process.cwd()) { return fs.existsSync(paths(root).state); }
export function initStore(root=process.cwd()) {
  const p=paths(root); fs.mkdirSync(p.runs,{recursive:true}); fs.mkdirSync(p.contexts,{recursive:true});
  if (!fs.existsSync(p.state)) writeState({project:{id:id('project'),name:path.basename(root),createdAt:now()},tasks:[],evidence:[],runs:[]},root);
  if (!fs.existsSync(p.events)) fs.writeFileSync(p.events,'');
  appendEvent('PROJECT_INITIALIZED',{root},root); return readState(root);
}
export function readState(root=process.cwd()) { return JSON.parse(fs.readFileSync(paths(root).state,'utf8')); }
export function writeState(state,root=process.cwd()) { fs.mkdirSync(paths(root).base,{recursive:true}); fs.writeFileSync(paths(root).state,JSON.stringify(state,null,2)+'\n'); }
export function appendEvent(type,payload,root=process.cwd()) {
  const event={id:id('evt'),type,at:now(),payload}; fs.appendFileSync(paths(root).events,JSON.stringify(event)+'\n'); return event;
}
export function addTasks(tasks,root=process.cwd()) {
  const s=readState(root); const existing=new Set(s.tasks.map(t=>t.id));
  for (const task of tasks) { if(existing.has(task.id)) throw new Error(`Duplicate task: ${task.id}`); s.tasks.push(task); appendEvent('TASK_IMPORTED',{taskId:task.id},root); }
  writeState(s,root); return s;
}
export function transition(taskId,to,meta={},root=process.cwd()) {
  const s=readState(root); const t=s.tasks.find(x=>x.id===taskId); if(!t) throw new Error(`Unknown task: ${taskId}`);
  assertTransition(t.state,to); const from=t.state; t.state=to; t.updatedAt=now(); Object.assign(t,meta);
  appendEvent('TASK_TRANSITION',{taskId,from,to,meta},root); writeState(s,root); return t;
}
export function recordRun(run,root=process.cwd()) { const s=readState(root); s.runs.push(run); appendEvent('RUN_RECORDED',{runId:run.id,taskId:run.taskId,status:run.status},root); writeState(s,root); }
export function recordEvidence(items,root=process.cwd()) { const s=readState(root); s.evidence.push(...items); for(const e of items) appendEvent('EVIDENCE_RECORDED',{evidenceId:e.id,taskId:e.taskId,type:e.type,status:e.status},root); writeState(s,root); }
