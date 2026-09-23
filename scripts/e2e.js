import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { initStore,addTasks,readState,verifyJournal,recordDecision } from '../src/store.js';
import { ensureProjectKit,REQUIRED_DOCUMENTS,REQUIRED_DECISIONS,readProjectContract,writeProjectContract,projectDocumentPath } from '../src/project-kit.js';
import { initializeHandover,handoverAudit,acceptHandover,addOwnerDecision,resolveOwnerDecision } from '../src/handover.js';
import { normalizeManagerPlan } from '../src/delivery.js';
import { finishProject } from '../src/finalize.js';
import { runTask } from '../src/runner.js';
import { verifyTask } from '../src/verifier.js';
import { acceptTask } from '../src/actions.js';
import { createServer } from '../src/server.js';

function sh(root,cmd,args=[]){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr||r.stdout}`);return (r.stdout||'').trim();}
function write(p,text){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
function gitCommit(root,message){sh(root,'git',['add','.']);sh(root,'git',['commit','-m',message]);}
function docText(name){return `# ${name}\n\nThis document is the approved project truth for the SHIPSTATE end-to-end certification fixture. It defines a deliberately small product with one implementation change, deterministic verification, fixed architecture, explicit quality gates, local deployment simulation, rollback behavior, and no unresolved product decisions. The autonomous engineering team must remain within this approved scope and must not invent additional features or dependencies.\n`;}
async function httpJson(url,opts={}){const r=await fetch(url,opts);let body=null;try{body=await r.json();}catch{}return {status:r.status,body};}
function initGit(root){sh(root,'git',['init','-b','main']);sh(root,'git',['config','user.name','SHIPSTATE E2E']);sh(root,'git',['config','user.email','shipstate-e2e@local']);}
function makeFinalizationFixture(name,{release='automatic',deployment='automatic',smokeFails=false,rollbackFails=false}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),`shipstate-finalize-${name}-`));initGit(root);
  write(path.join(root,'app.js'),'export const answer = () => 42;\n');
  write(path.join(root,'check.js'),'import {answer} from "./app.js"; if(answer()!==42) process.exit(1);\n');
  write(path.join(root,'deploy.js'),'import fs from "node:fs"; fs.writeFileSync("deployed.flag","deployed\\n");\n');
  write(path.join(root,'smoke.js'),smokeFails?'process.exit(9);\n':'import fs from "node:fs"; if(!fs.existsSync("deployed.flag")) process.exit(2);\n');
  write(path.join(root,'rollback.js'),rollbackFails?'process.exit(8);\n':'import fs from "node:fs"; if(fs.existsSync("deployed.flag")) fs.unlinkSync("deployed.flag"); fs.writeFileSync("rollback.flag","rolled back\\n");\n');
  write(path.join(root,'package.json'),JSON.stringify({name:`finalize-${name}`,private:true,type:'module',scripts:{test:'node check.js',build:'node --check app.js'}},null,2)+'\n');gitCommit(root,'fixture: finalization project');
  initStore(root,`Finalize ${name}`);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['service'];c.project.platforms=[];c.autonomy.release=release;c.autonomy.deployment=deployment;c.delivery.buildCommands=['node check.js'];c.delivery.deployCommands=['node deploy.js'];c.delivery.smokeCommands=['node smoke.js'];c.delivery.rollbackCommands=['node rollback.js'];c.qualityCertification.commands.security=['node --check app.js'];writeProjectContract(c,root);return root;
}

const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-e2e-')),extraRoots=[];
console.log(`E2E fixture: ${root}`);

try{
  initGit(root);
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
  contract.project.classes=['service'];contract.project.platforms=[];contract.autonomy.release='automatic';contract.autonomy.deployment='automatic';
  contract.delivery.buildCommands=['node check.js'];contract.delivery.deployCommands=['node deploy.js'];contract.delivery.smokeCommands=['node smoke.js'];contract.delivery.rollbackCommands=['node rollback.js'];contract.qualityCertification.commands.security=['node --check app.js'];
  writeProjectContract(contract,root);gitCommit(root,'docs: approve autonomous handover contract');

  console.log('2/9 deterministic handover gate');
  audit=handoverAudit(root);assert.equal(audit.ready,true,JSON.stringify(audit.blockers));const handover=acceptHandover(root);assert.equal(handover.status,'READY_FOR_HANDOVER');

  console.log('3/9 manager output -> bounded task DAG');
  const plan=normalizeManagerPlan({status:'PLAN',summary:'Implement approved answer behavior',milestones:[{id:'M1',title:'Core',objective:'Complete fixture'}],tasks:[{id:'E2E-001',title:'Implement approved answer',objective:'Change answer() to return 42 without changing the contract.',milestone:'M1',acceptanceCriteria:['answer() returns exactly 42'],verification:['node check.js'],files:['app.js','check.js'],allowedPaths:['app.js'],protectedPaths:[],evidenceRequired:['command','diff'],dependsOn:[],priority:100,risk:'low'}]},readState(root));
  assert.equal(plan.tasks.length,1);addTasks(plan.tasks,root);recordDecision({id:'decision-e2e-plan',type:'autonomous-plan',actor:'codex-e2e',at:new Date().toISOString(),taskCount:1},root);

  console.log('4/9 isolated developer implementation');
  const run=await runTask('E2E-001','manual',root);assert.equal(run.status,'awaiting_manual');assert.ok(run.worktreePath);assert.equal(fs.readFileSync(path.join(root,'app.js'),'utf8').includes('42'),false);
  write(path.join(run.worktreePath,'app.js'),'export const answer = () => 42;\n');

  console.log('5/9 deterministic verification + candidate acceptance');
  const verification=verifyTask('E2E-001',root);assert.equal(verification.passed,true);assert.ok(verification.candidateCommit);recordDecision({id:'decision-e2e-review',type:'code-review',actor:'codex-e2e',taskId:'E2E-001',at:new Date().toISOString(),verdict:'APPROVE'},root);const accepted=acceptTask('E2E-001',root,'codex-e2e');assert.equal(accepted.accepted,true);assert.match(fs.readFileSync(path.join(root,'app.js'),'utf8'),/42/);

  console.log('6/9 real finishProject automatic certification + deployment');
  const finished=await finishProject(root);assert.equal(finished.complete,true);assert.equal(finished.delivered,true);assert.equal(finished.certification.passed,true);assert.equal(finished.quality.passed,true);assert.equal(finished.deployment.passed,true);assert.equal(finished.smoke.passed,true);assert.equal(readState(root).delivery.state,'DELIVERED');assert.equal(fs.existsSync(path.join(root,'deployed.flag')),true);

  console.log('7/9 finalization owner gates + smoke rollback matrix');
  const gated=makeFinalizationFixture('gated',{release:'owner_gate',deployment:'owner_gate'});extraRoots.push(gated);let result=await finishProject(gated);assert.equal(result.awaiting,'release');let state=readState(gated),decision=state.ownerDecisions.find(d=>d.status==='OPEN'&&d.gate==='release');assert.ok(decision);resolveOwnerDecision(decision.id,'approve','E2E release approval',gated);result=await finishProject(gated);assert.equal(result.awaiting,'deployment');state=readState(gated);decision=state.ownerDecisions.find(d=>d.status==='OPEN'&&d.gate==='deployment');assert.ok(decision);resolveOwnerDecision(decision.id,'approve','E2E deployment approval',gated);result=await finishProject(gated);assert.equal(result.delivered,true);assert.equal(readState(gated).delivery.state,'DELIVERED');
  const rollbackOk=makeFinalizationFixture('rollback-ok',{smokeFails:true});extraRoots.push(rollbackOk);result=await finishProject(rollbackOk);assert.equal(result.complete,false);assert.equal(result.smoke.passed,false);assert.equal(result.rollback.passed,true);assert.equal(readState(rollbackOk).delivery.state,'BLOCKED');assert.equal(fs.existsSync(path.join(rollbackOk,'deployed.flag')),false);assert.equal(fs.existsSync(path.join(rollbackOk,'rollback.flag')),true);
  const rollbackBad=makeFinalizationFixture('rollback-fails',{smokeFails:true,rollbackFails:true});extraRoots.push(rollbackBad);result=await finishProject(rollbackBad);assert.equal(result.complete,false);assert.equal(result.rollback.passed,false);assert.equal(readState(rollbackBad).delivery.rollbackAttempted,true);assert.equal(fs.existsSync(path.join(rollbackBad,'deployed.flag')),true);

  console.log('8/9 owner decision pause/resume semantics + journal integrity');
  const d=addOwnerDecision({title:'Synthetic maintenance decision',question:'Continue?',options:['retry','replan','pause'],recommendation:'retry',impact:'E2E only',source:'e2e'},root);assert.equal(readState(root).delivery.state,'OWNER_DECISION_REQUIRED');resolveOwnerDecision(d.id,'retry','resume allowed',root);assert.equal(readState(root).ownerDecisions.find(x=>x.id===d.id).status,'RESOLVED');assert.equal(verifyJournal(root).valid,true);

  console.log('9/9 dashboard/API read + mutation-token protection');
  const app=createServer({root,host:'127.0.0.1',port:0});const info=await app.listen();try{const stateRead=await httpJson(`${info.url}/api/state`);assert.equal(stateRead.status,200);assert.equal(stateRead.body.project.name,'SHIPSTATE E2E Fixture');const denied=await httpJson(`${info.url}/api/action`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'backup'})});assert.equal(denied.status,403);const allowed=await httpJson(`${info.url}/api/action`,{method:'POST',headers:{'content-type':'application/json','x-shipstate-token':info.token},body:JSON.stringify({action:'backup'})});assert.equal(allowed.status,200);assert.equal(allowed.body.ok,true);}finally{await new Promise(resolve=>app.server.close(resolve));}

  const final=readState(root);assert.equal(final.tasks[0].state,'ACCEPTED');assert.equal(final.delivery.deployed,true);assert.equal(final.evidence.some(e=>e.taskId==='PROJECT'&&e.type==='project-certification'&&e.status==='passed'),true);assert.equal(final.evidence.some(e=>e.taskId==='PROJECT'&&e.type==='deployment'&&e.status==='passed'),true);assert.equal(final.evidence.some(e=>e.taskId==='PROJECT'&&e.type==='production-smoke'&&e.status==='passed'),true);assert.equal(verifyJournal(root).valid,true);
  console.log('SHIPSTATE autonomous delivery E2E: PASS');
} finally {
  for(const p of [root,...extraRoots])try{fs.rmSync(p,{recursive:true,force:true});}catch{}
}
