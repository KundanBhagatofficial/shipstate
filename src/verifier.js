import { spawnSync } from 'node:child_process';
import { id, now, hash } from './core.js';
import { readState, recordEvidence, transition } from './store.js';

function exec(command,root) { const r=spawnSync(command,{cwd:root,encoding:'utf8',shell:true}); return {exitCode:r.status??1,stdout:r.stdout||'',stderr:r.stderr||''}; }
export function verifyTask(taskId,root=process.cwd()) {
  const s=readState(root); const task=s.tasks.find(t=>t.id===taskId); if(!task) throw new Error(`Unknown task: ${taskId}`);
  if(task.state!=='IMPLEMENTED') throw new Error(`Task ${taskId} must be IMPLEMENTED before verification (is ${task.state})`);
  transition(taskId,'VERIFYING',{},root); const evidence=[]; let passed=true;
  for(const command of task.verification??[]) {
    const r=exec(command,root); const status=r.exitCode===0?'passed':'failed'; if(status==='failed') passed=false;
    evidence.push({id:id('ev'),taskId,type:'command',source:command,status,exitCode:r.exitCode,outputHash:hash(`${r.stdout}\n${r.stderr}`),createdAt:now()});
  }
  if(!(task.verification??[]).length) { passed=false; evidence.push({id:id('ev'),taskId,type:'policy',source:'verification commands required',status:'failed',createdAt:now()}); }
  recordEvidence(evidence,root); transition(taskId,passed?'VERIFIED':'FAILED',{verifiedAt:passed?now():null},root); return {passed,evidence};
}
