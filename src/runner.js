import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { id, now, hash } from './core.js';
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
  if(task.state==='PENDING' || task.state==='FAILED') transition(taskId,'READY',{},root);
  transition(taskId,'RUNNING',{lastAgent:agent},root);
  const ctx=compileContext(taskId,root); const spec=commandFor(agent,path.relative(root,ctx.path)); const startedAt=now();
  const r=spawnSync(spec.cmd,spec.args,{cwd:root,encoding:'utf8',shell:false});
  const status=r.status===0?'passed':'failed'; const failureText=`${r.stderr||''}\n${r.stdout||''}`.trim();
  const run={id:id('run'),taskId,agent,startedAt,completedAt:now(),exitCode:r.status??1,status,contextHash:ctx.hash,stdout:r.stdout||'',stderr:r.stderr||'',failureFingerprint:status==='failed'?hash(failureText.replace(/\d+/g,'#')).slice(0,12):null};
  recordRun(run,root); transition(taskId,status==='passed'?'IMPLEMENTED':'FAILED',{lastRunId:run.id},root); return run;
}
