import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { initStore,addTasks,readState,verifyJournal,paths,recordDecision } from '../src/store.js';
import { ensureProjectKit,REQUIRED_DOCUMENTS,REQUIRED_DECISIONS,readProjectContract,writeProjectContract,projectDocumentPath } from '../src/project-kit.js';
import { initializeHandover,handoverAudit,acceptHandover,setProjectLifecycle,addOwnerDecision,resolveOwnerDecision } from '../src/handover.js';
import { normalizeManagerPlan,certifyProject } from '../src/delivery.js';
import { runTask } from '../src/runner.js';
import { verifyTask } from '../src/verifier.js';
import { acceptTask } from '../src/actions.js';
import { createServer } from '../src/server.js';

function sh(root,cmd,args=[]){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr||r.stdout}`);return (r.stdout||'').trim();}
function write(p,text){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
function gitCommit(root,message){sh(root,'git',['add','.']);sh(root,'git',['commit','-m',message]);}
function docText(name){return `# ${name}\n\nThis document is the approved project truth for the SHIPSTATE end-to-end certification fixture. It defines a deliberately small product with one implementation change, deterministic verification, fixed architecture, explicit quality gates, local deployment simulation, rollback behavior, and no unresolved product decisions. The autonomous engineering team must remain within this approved scope and must not invent additional features or dependencies.\n`;}
async function httpJson(url,opts={}){const r=await fetch(url,opts);let body=null;try{body=await r.json();}catch{}return {status:r.status,body};}

const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-e2e-'));
console.log(`E2E fixture: ${root}`);

try{
  sh(root,'git',['init','-b','main']);sh(root,'git',['config','user.name','SHIPSTATE E2E']);sh(root,'git',['config','user.email','shipstate-e2e@local']);
  write(path.join(root,'app.js'),'export const answer = () => 1;\n');
  write(path.join(root,'check.js'),'import {answer} from "./app.js"; if(answer()!==42){console.error(`expected 42, got ${answer()}`);process.exit(1)}\n');
  write(path.join(root,'deploy.js'),'import fs from "node:fs"; fs.writeFileSync("deployed.flag","deployed\\n");\n');
  write(path.join(root,'smoke.js'),'import fs from "node:fs"; if(!fs.existsSync("deployed.flag")) process.exit(2); const {answer}=await import("./app.js"); if(answer()!==42) process.exit(3);\n');
  write(path.join(root,'rollback.js'),'import fs from "node:fs"; if(fs.existsSync("deployed.flag")) fs.unlinkSync("deployed.flag");\n');
  write(path.join(root,'package.json'),JSON.stringify({name:'shipstate-e2e-fixture',private:true,type:'module',scripts:{test:'node check.js',build:'node --check app.js'}},null,2)+'\n');
  gitCommit(root,'fixture: initial project');

  console.log('1/9 init + canonical project pack');
  initStore(root,'SHIPSTATE E2E Fixture');ensureProjectKit(root);initializeHandover(root);
  let audit=handoverAudit(root);assert.equal(audit.ready,false);assert.ok(audit.blockers.some(x=>x.type==='document'));assert.ok(audit.blockers.some(x=>x.type==='decision'));

  for(const doc of REQUIRED_DOCUMENTS)write(projectDocumentPath(root,doc),docText(doc.file));
  const contract=readProjectContract(root);
  for(const d of REQUIRED_DECISIONS)contract.decisions[d.key]={...(contract.decisions[d.key]||{}),status:'approved',note:'approved by E2E owner',decidedAt:new Date().toISOString()};
  contract.autonomy.release='automatic';contract.autonomy.deployment='automatic';
  contract.delivery.buildCommands=['node check.js'];contract.delivery.deployCommands=['node deploy.js'];contract.delivery.smokeCommands=['node smoke.js'];contract.delivery.rollbackCommands=['node rollback.js'];
  writeProjectContract(contract,root);gitCommit(root,'docs: approve autonomous handover contract');

  console.log('2/9 deterministic handover gate');
  audit=handoverAudit(root);assert.equal(audit.ready,true,JSON.stringify(audit.blockers));const handover=acceptHandover(root);assert.equal(handover.status,'READY_FOR_HANDOVER');

  console.log('3/9 manager output -> bounded task DAG');
  const plan=normalizeManagerPlan({status:'PLAN',summary:'Implement approved answer behavior',milestones:[{id:'M1',title:'Core',objective:'Complete fixture'}],tasks:[{id:'E2E-001',title:'Implement approved answer',objective:'Change answer() to return 42 without changing the contract.',milestone:'M1',acceptanceCriteria:['answer() returns exactly 42'],verification:['node check.js'],files:['app.js','check.js'],allowedPaths:['app.js'],protectedPaths:[],evidenceRequired:['command','diff'],dependsOn:[],priority:100,risk:'low'}]},readState(root));
  assert.equal(plan.tasks.length,1);addTasks(plan.tasks,root);recordDecision({id:'decision-e2e-plan',type:'autonomous-plan',actor:'codex-e2e',at:new Date().toISOString(),taskCount:1},root);setProjectLifecycle('AUTONOMOUS_DEVELOPMENT',{e2e:true},root);

  console.log('4/9 isolated developer implementation');
  const run=await runTask('E2E-001','manual',root);assert.equal(run.status,'awaiting_manual');assert.ok(run.worktreePath);assert.equal(fs.readFileSync(path.join(root,'app.js'),'utf8').includes('42'),false);
  write(path.join(run.worktreePath,'app.js'),'export const answer = () => 42;\n');

  console.log('5/9 deterministic verification + candidate acceptance');
  const verification=verifyTask('E2E-001',root);assert.equal(verification.passed,true);assert.ok(verification.candidateCommit);recordDecision({id:'decision-e2e-review',type:'code-review',actor:'codex-e2e',taskId:'E2E-001',at:new Date().toISOString(),verdict:'APPROVE'},root);const accepted=acceptTask('E2E-001',root,'codex-e2e');assert.equal(accepted.accepted,true);assert.match(fs.readFileSync(path.join(root,'app.js'),'utf8'),/42/);

  console.log('6/9 project certification');
  setProjectLifecycle('INTERNAL_CERTIFICATION',{},root);const certification=certifyProject(root);assert.equal(certification.passed,true);assert.ok(certification.evidence.length>=1);

  console.log('7/9 deployment + production smoke + delivery lifecycle');
  setProjectLifecycle('RELEASE_CANDIDATE',{},root);setProjectLifecycle('DEPLOYMENT',{},root);sh(root,'node',['deploy.js']);assert.equal(fs.existsSync(path.join(root,'deployed.flag')),true);setProjectLifecycle('DELIVERY_VALIDATION',{},root);sh(root,'node',['smoke.js']);setProjectLifecycle('DELIVERY_READY',{deployed:true},root);setProjectLifecycle('DELIVERED',{deployed:true},root);assert.equal(readState(root).delivery.state,'DELIVERED');

  console.log('8/9 owner decision pause/resume semantics + journal integrity');
  const d=addOwnerDecision({title:'Synthetic maintenance decision',question:'Continue?',options:['retry','replan','pause'],recommendation:'retry',impact:'E2E only',source:'e2e'},root);assert.equal(readState(root).delivery.state,'OWNER_DECISION_REQUIRED');resolveOwnerDecision(d.id,'retry','resume allowed',root);assert.equal(readState(root).ownerDecisions.find(x=>x.id===d.id).status,'RESOLVED');assert.equal(verifyJournal(root).valid,true);

  console.log('9/9 dashboard/API read + mutation-token protection');
  const app=createServer({root,host:'127.0.0.1',port:0});const info=await app.listen();try{const stateRead=await httpJson(`${info.url}/api/state`);assert.equal(stateRead.status,200);assert.equal(stateRead.body.project.name,'SHIPSTATE E2E Fixture');const denied=await httpJson(`${info.url}/api/action`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'backup'})});assert.equal(denied.status,403);const allowed=await httpJson(`${info.url}/api/action`,{method:'POST',headers:{'content-type':'application/json','x-shipstate-token':info.token},body:JSON.stringify({action:'backup'})});assert.equal(allowed.status,200);assert.equal(allowed.body.ok,true);}finally{await new Promise(resolve=>app.server.close(resolve));}

  const final=readState(root);assert.equal(final.tasks[0].state,'ACCEPTED');assert.equal(final.delivery.deployed,true);assert.equal(final.evidence.some(e=>e.taskId==='PROJECT'&&e.type==='project-certification'&&e.status==='passed'),true);assert.equal(verifyJournal(root).valid,true);
  console.log('SHIPSTATE autonomous delivery E2E: PASS');
} finally {
  try{fs.rmSync(root,{recursive:true,force:true});}catch{}
}
