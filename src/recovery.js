import { readState,writeState,appendEvent } from './store.js';import { removeWorktree,head,parentOf,treeHash,abortCherryPick } from './git.js';import { now } from './utils.js';
function latestRun(state,task){return state.runs.find(r=>r.id===task.lastRunId)||state.runs.filter(r=>r.taskId===task.id).at(-1);}
function alreadyIntegrated(run,root){if(!run?.candidateCommit||!run?.baseCommit)return false;try{const current=head(root);return current!==run.baseCommit&&parentOf(root,current)===run.baseCommit&&treeHash(root,current)===treeHash(root,run.candidateCommit);}catch{return false;}}
export function recover(root=process.cwd()){
 const s=readState(root),fixed=[];
 for(const t of s.tasks){
  const from=t.state,run=latestRun(s,t);let to=null,meta={};
  if(from==='RUNNING'){
   to='READY';meta={recoveredAt:now(),recoveryReason:'interrupted execution'};
   if(run&&run.status==='running'){run.status='interrupted';run.completedAt=now();run.recoveryReason='process no longer active during recovery';appendEvent('RUN_RECORDED',{run},root);}if(run?.worktreePath)removeWorktree(run.worktreePath,root);
  }else if(from==='VERIFYING'){to='IMPLEMENTED';meta={recoveredAt:now(),recoveryReason:'interrupted verification'};}
  else if(from==='ACCEPTING'){
   if(alreadyIntegrated(run,root)){to='ACCEPTED';meta={acceptedAt:now(),integratedCommit:head(root),recoveredAt:now(),recoveryReason:'candidate integration completed before state persistence'};if(run?.worktreePath)removeWorktree(run.worktreePath,root);}else{abortCherryPick(root);to='VERIFIED';meta={recoveredAt:now(),recoveryReason:'interrupted acceptance; candidate not confirmed integrated'};}
  }
  if(to){t.state=to;t.updatedAt=now();Object.assign(t,meta);fixed.push([t.id,from,to]);appendEvent('TASK_RECOVERED',{taskId:t.id,from,to,meta},root);}
 }
 writeState(s,root);return {recovered:fixed};
}
