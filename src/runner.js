import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { id, now, hash, eligible } from './core.js';
import { compileContext } from './context.js';
import { readState, recordRun, transition } from './store.js';

export function commandFor(agent,contextPath) {
  if(agent==='claude') return {cmd:'claude',args:['-p',`Read ${contextPath} and implement the task. Do not modify .shipstate.`]};
  if(agent==='codex') return {cmd:'codex',args:['exec',`Read ${contextPath} and implement the task. Do not modify .shipstate.`]};
  if(agent==='dry-run') return {cmd:process.execPath,args:['-e','console.log("SHIPSTATE dry-run: no repository changes made")']};
  throw new Error(`Unsupported agent: ${agent}`);
}
export function runTask(taskId,agent='dry-run',root=process.cwd()) {
  const s=readState(root); const task=s.tasks.find(t=>t.id===taskId); if(!task) throw new Error(`Unknown task: ${taskId}`);
  const byId=Object.fromEntries(s.tasks.map(t=>[t.id,t]));
  if(task.state==='PENDING' || task.state==='FAILED') {
    if(!eligible(task,byId)) throw new Error(`Task ${taskId} is not eligible; all dependencies must be VERIFIED`);
    transition(taskId,'READY',{},root);
  }
  if(task.state!=='READY' && task.state!=='PENDING' && task.state!=='FAILED') throw new Error(`Task ${taskId} cannot run from ${task.state}`);
  transition(taskId,'RUNNING',{lastAgent:agent},root);
  const ctx=compileContext(taskId,root); const spec=commandFor(agent,path.relative(root,ctx.path)); const startedAt=now();
  const r=spawnSync(spec.cmd,spec.args,{cwd:root,encoding:'utf8',shell:false});
  const status=r.status===0?'passed':'failed'; const failureText=`${r.stderr||''}\n${r.stdout||''}`.trim();
  const run={id:id('run'),taskId,agent,startedAt,completedAt:now(),exitCode:r.status??1,status,contextHash:ctx.hash,stdout:r.stdout||'',stderr:r.stderr||'',failureFingerprint:status==='failed'?hash(failureText.replace(/\d+/g,'#')).slice(0,12):null};
  recordRun(run,root);
  if(status==='passed') transition(taskId,'IMPLEMENTED',{lastRunId:run.id},root);
  else {
    const after=readState(root);
    const repeats=after.runs.filter(x=>x.taskId===taskId && x.failureFingerprint===run.failureFingerprint).length;
    transition(taskId,repeats>=3?'BLOCKED':'FAILED',{lastRunId:run.id,blockedReason:repeats>=3?'repeated_failure':null},root);
  }
  return run;
}
