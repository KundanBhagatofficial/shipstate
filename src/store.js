import fs from 'node:fs';
import path from 'node:path';
import { id,now,sha256,ensureDir,readJson,writeJsonAtomic } from './utils.js';
import { assertTransition } from './core.js';
import { detectProject } from './profile.js';

export const CURRENT_SCHEMA=5;
const LEGACY_CONTROL_PATHS=['shipstate.project.json','docs/shipstate/**'];

export function paths(root=process.cwd()){
  const base=path.join(root,'.shipstate');
  return {base,state:path.join(base,'state.json'),prev:path.join(base,'state.prev.json'),events:path.join(base,'events.jsonl'),runs:path.join(base,'runs'),contexts:path.join(base,'contexts'),worktrees:path.join(base,'worktrees'),locks:path.join(base,'locks.json'),profiles:path.join(base,'profile.json'),backups:path.join(base,'backups'),cache:path.join(base,'cache'),advisories:path.join(base,'advisories')};
}
export const initialized=(root=process.cwd())=>fs.existsSync(paths(root).state);

function validStateSnapshot(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&value.project&&typeof value.project==='object'&&Array.isArray(value.tasks)&&Array.isArray(value.runs)&&Array.isArray(value.evidence)&&Array.isArray(value.decisions));}
function readValidStateFile(file){const value=readJson(file);return validStateSnapshot(value)?value:null;}
function assertHashedJournal(events){let prev='GENESIS';for(let i=0;i<events.length;i++){const event=events[i];if(!event||typeof event!=='object'||!event.hash||!event.prevHash)throw new Error(`Journal event at line ${i+1} is missing hash metadata`);const {hash,...base}=event;if(event.prevHash!==prev||sha256(JSON.stringify(base))!==hash)throw new Error(`Journal hash chain is invalid at ${event.id||`line ${i+1}`}`);prev=hash;}return prev;}
function parseJournalForMutation(file){const out=[];let lineNo=0;for(const line of fs.readFileSync(file,'utf8').split(/\n/).filter(Boolean)){lineNo++;try{out.push(JSON.parse(line));}catch(e){throw new Error(`Journal mutation blocked: malformed JSON at line ${lineNo}: ${e.message}`);}}return out;}
function ensureJournalFormat(root){
  const f=paths(root).events;if(!fs.existsSync(f))return;
  const parsed=parseJournalForMutation(f);if(!parsed.length)return;
  const hashed=parsed.filter(e=>e&&typeof e==='object'&&(Object.hasOwn(e,'hash')||Object.hasOwn(e,'prevHash'))).length;
  if(hashed===parsed.length){assertHashedJournal(parsed);return;}
  if(hashed>0)throw new Error('Journal mutation blocked: mixed legacy and hashed events require manual recovery');
  ensureDir(paths(root).backups);fs.copyFileSync(f,path.join(paths(root).backups,`events-legacy-${Date.now()}.jsonl`));
  let prev='GENESIS';const out=[];
  for(const old of parsed){const base={id:old.id||id('evt'),type:old.type||'LEGACY_EVENT',at:old.at||now(),payload:old.payload||old,prevHash:prev};const event={...base,hash:sha256(JSON.stringify(base))};out.push(JSON.stringify(event));prev=event.hash;}
  fs.writeFileSync(f,out.join('\n')+'\n');
}
function autonomousDefaults(){return {handover:{status:'DRAFT',contractHash:null},delivery:{state:'PROJECT_SETUP',planBootstrapped:false,authorizedGates:{}},team:{manager:'codex',reviewer:'codex',developer:'claude',verifier:'shipstate'},ownerDecisions:[],intelligence:{projectTruth:null,providers:{},quality:{}},repairEpisodes:[]};}
function emptyState(root,name){return {schemaVersion:CURRENT_SCHEMA,project:{id:id('project'),name:name||path.basename(root),createdAt:now(),allowedPaths:[],protectedPaths:[],defaultAgent:'manual',autoAcceptRisk:['low']},profile:detectProject(root),tasks:[],runs:[],evidence:[],decisions:[],metrics:{contexts:[],agentRuns:[],projectTruth:[],providers:[],tokenEconomy:[]},locks:[],plans:[],remotes:[],...autonomousDefaults()};}
function migrate(s){
  let out=structuredClone(s||{}),v=Number(out.schemaVersion||1);
  if(v<2){out.decisions||=[];out.metrics||={contexts:[],agentRuns:[]};out.locks||=[];out.plans||=[];v=2;}
  if(v<3){out.profile||={};out.remotes||=[];out.project||={};out.project.autoAcceptRisk||=['low'];v=3;}
  if(v<4){const d=autonomousDefaults();out.handover||=d.handover;out.delivery||=d.delivery;out.team||=d.team;out.ownerDecisions||=[];v=4;}
  if(v<5){const d=autonomousDefaults();out.intelligence||=d.intelligence;out.repairEpisodes||=[];out.metrics||={};out.metrics.projectTruth||=[];out.metrics.providers||=[];out.metrics.tokenEconomy||=[];v=5;}
  out.delivery={...autonomousDefaults().delivery,...(out.delivery||{}),authorizedGates:{...(out.delivery?.authorizedGates||{})}};
  out.handover={...autonomousDefaults().handover,...(out.handover||{})};
  out.team={...autonomousDefaults().team,...(out.team||{})};
  out.ownerDecisions||=[];
  out.intelligence={...autonomousDefaults().intelligence,...(out.intelligence||{}),providers:{...(out.intelligence?.providers||{})},quality:{...(out.intelligence?.quality||{})}};
  out.repairEpisodes||=[];
  out.metrics={contexts:[],agentRuns:[],projectTruth:[],providers:[],tokenEconomy:[],...(out.metrics||{})};
  out.schemaVersion=CURRENT_SCHEMA;return out;
}
function mergeIntelligence(current={},patch={}){return {...current,...patch,providers:{...(current.providers||{}),...(patch.providers||{})},quality:{...(current.quality||{}),...(patch.quality||{})}};}

export function initStore(root=process.cwd(),name){const p=paths(root);for(const d of [p.base,p.runs,p.contexts,p.worktrees,p.backups,p.cache,p.advisories])ensureDir(d);const created=!fs.existsSync(p.state);if(created)writeJsonAtomic(p.state,emptyState(root,name));if(!fs.existsSync(p.events))fs.writeFileSync(p.events,'');ensureJournalFormat(root);if(created)appendEvent('PROJECT_INITIALIZED',{root,project:readJson(p.state)?.project,profile:readJson(p.state)?.profile,schemaVersion:CURRENT_SCHEMA},root);ensureGitignore(root);return readState(root);}
function ensureGitignore(root){const f=path.join(root,'.gitignore');let t=fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';if(!t.split(/\r?\n/).includes('.shipstate/')){if(t&&!t.endsWith('\n'))t+='\n';fs.writeFileSync(f,t+'.shipstate/\n');}}
export function readState(root=process.cwd()){ensureJournalFormat(root);const p=paths(root);let raw=readValidStateFile(p.state);if(!raw&&fs.existsSync(p.prev)){raw=readValidStateFile(p.prev);if(raw)writeJsonAtomic(p.state,raw);}if(!raw)throw new Error('SHIPSTATE state missing or invalid; no last-good snapshot available');const s=migrate(raw);if(s.schemaVersion!==raw.schemaVersion)writeState(s,root);return s;}
export function writeState(s,root=process.cwd(),{snapshot=true}={}){s.schemaVersion=CURRENT_SCHEMA;const p=paths(root);if(snapshot&&fs.existsSync(p.state)){const current=readValidStateFile(p.state);if(current)writeJsonAtomic(p.prev,current);}writeJsonAtomic(p.state,s);}
function lastEventHash(root){const f=paths(root).events;if(!fs.existsSync(f))return 'GENESIS';const lines=fs.readFileSync(f,'utf8').trim().split(/\n/).filter(Boolean);if(!lines.length)return 'GENESIS';const last=JSON.parse(lines.at(-1));if(!last.hash)throw new Error('Journal mutation blocked: last event has no hash');return last.hash;}
export function appendEvent(type,payload,root=process.cwd()){ensureDir(paths(root).base);if(!fs.existsSync(paths(root).events))fs.writeFileSync(paths(root).events,'');ensureJournalFormat(root);const prevHash=lastEventHash(root),base={id:id('evt'),type,at:now(),payload,prevHash},event={...base,hash:sha256(JSON.stringify(base))};fs.appendFileSync(paths(root).events,JSON.stringify(event)+'\n');return event;}
export function verifyJournal(root=process.cwd()){if(!fs.existsSync(paths(root).events))return {valid:true,count:0};let prev='GENESIS',count=0,lineNo=0;for(const line of fs.readFileSync(paths(root).events,'utf8').split(/\n/).filter(Boolean)){lineNo++;let e;try{e=JSON.parse(line);}catch(err){return {valid:false,count,error:`malformed event JSON at line ${lineNo}: ${err.message}`};}const {hash,...base}=e;if(e.prevHash!==prev||sha256(JSON.stringify(base))!==hash)return {valid:false,count,error:`broken event chain at ${e.id||`line ${lineNo}`}`};prev=hash;count++;}return {valid:true,count,lastHash:prev};}
export function backupState(root=process.cwd()){const p=paths(root);ensureDir(p.backups);const out=path.join(p.backups,`state-${Date.now()}.json`);fs.copyFileSync(p.state,out);return out;}
export function refreshProfile(root=process.cwd()){const s=readState(root);s.profile=detectProject(root);appendEvent('PROFILE_REFRESHED',{profile:s.profile},root);writeState(s,root);return s.profile;}
export function addTasks(tasks,root=process.cwd()){const s=readState(root),ids=new Set(s.tasks.map(t=>t.id));for(const raw of tasks){const t={...raw};if(ids.has(t.id))throw new Error(`Duplicate task: ${t.id}`);ids.add(t.id);if(!(t.verification||[]).length)t.verification=[s.profile?.commands?.test,s.profile?.commands?.typecheck,s.profile?.commands?.lint].filter(Boolean);if(!(t.allowedPaths||[]).length)t.allowedPaths=[...(s.profile?.sourceDirs||[]).map(x=>`${x}/**`),...(s.profile?.testDirs||[]).filter(Boolean).map(x=>`${x}/**`)];s.tasks.push(t);appendEvent('TASK_IMPORTED',{task:t},root);}writeState(s,root);return s;}
export function transition(taskId,to,meta={},root=process.cwd()){const s=readState(root),t=s.tasks.find(x=>x.id===taskId);if(!t)throw new Error(`Unknown task: ${taskId}`);assertTransition(t.state,to);const from=t.state;t.state=to;t.updatedAt=now();Object.assign(t,meta);appendEvent('TASK_TRANSITION',{taskId,from,to,meta},root);writeState(s,root);return t;}
export function mutateTask(taskId,patch,event='TASK_UPDATED',root=process.cwd()){const s=readState(root),t=s.tasks.find(x=>x.id===taskId);if(!t)throw new Error(`Unknown task: ${taskId}`);Object.assign(t,patch,{updatedAt:now()});appendEvent(event,{taskId,patch},root);writeState(s,root);return t;}
export function mutateDelivery(patch,event='DELIVERY_UPDATED',root=process.cwd()){const s=readState(root);s.delivery={...(s.delivery||{}),...patch,authorizedGates:{...(s.delivery?.authorizedGates||{}),...(patch.authorizedGates||{})}};appendEvent(event,{patch:s.delivery},root);writeState(s,root);return s.delivery;}
export function recordRun(run,root=process.cwd()){const s=readState(root),i=s.runs.findIndex(r=>r.id===run.id);if(i>=0)s.runs[i]=run;else s.runs.push(run);appendEvent('RUN_RECORDED',{run},root);writeState(s,root);return run;}
export function recordEvidence(items,root=process.cwd()){const s=readState(root);s.evidence.push(...items);for(const e of items)appendEvent('EVIDENCE_RECORDED',{evidence:e},root);writeState(s,root);return items;}
export function recordDecision(decision,root=process.cwd()){const s=readState(root);s.decisions.push(decision);appendEvent('DECISION_RECORDED',decision,root);writeState(s,root);return decision;}
export function recordMetric(kind,item,root=process.cwd()){const s=readState(root);s.metrics[kind]||=[];s.metrics[kind].push(item);appendEvent('METRIC_RECORDED',{kind,item},root);writeState(s,root);return item;}
export function recordIntelligence(patch,event='INTELLIGENCE_UPDATED',root=process.cwd()){const s=readState(root);s.intelligence=mergeIntelligence(s.intelligence,patch);appendEvent(event,{kind:'intelligence',patch},root);writeState(s,root);return s.intelligence;}
export function recordRepairEpisode(episode,root=process.cwd()){const s=readState(root),i=s.repairEpisodes.findIndex(x=>x.id===episode.id);if(i>=0)s.repairEpisodes[i]=episode;else s.repairEpisodes.push(episode);appendEvent('REPAIR_EPISODE_RECORDED',{episode},root);writeState(s,root);return episode;}
export function setLocks(locks,root=process.cwd()){const s=readState(root);s.locks=locks;appendEvent('DESIGN_LOCKS_UPDATED',{count:locks.length,locks},root);writeState(s,root);return locks;}
export function addPlan(plan,root=process.cwd()){const s=readState(root);s.plans.push(plan);appendEvent('PLAN_CREATED',{plan},root);writeState(s,root);return plan;}
export function rebuildFromSnapshot(root=process.cwd()){const j=verifyJournal(root);if(!j.valid)throw new Error(j.error);return {ok:true,journal:j,state:readState(root)};}

function parseJournalLines(root){const out=[];let lineNo=0;for(const line of fs.readFileSync(paths(root).events,'utf8').split(/\n/).filter(Boolean)){lineNo++;try{out.push(JSON.parse(line));}catch(e){throw new Error(`Journal contains malformed JSON at line ${lineNo}: ${e.message}`);}}return out;}
function replayTaskPatch(state,q){if(!q?.taskId||!q?.patch)return;const t=state.tasks.find(x=>x.id===q.taskId);if(t)Object.assign(t,q.patch);}
export function replayStateFromJournal(root=process.cwd()){
  ensureJournalFormat(root);const lines=parseJournalLines(root);let state=null;
  for(const e of lines){
    const q=e.payload||{};
    if(e.type==='PROJECT_INITIALIZED'&&q.project){if(!state)state={schemaVersion:CURRENT_SCHEMA,project:q.project,profile:q.profile||{},tasks:[],runs:[],evidence:[],decisions:[],metrics:{contexts:[],agentRuns:[],projectTruth:[],providers:[],tokenEconomy:[]},locks:[],plans:[],remotes:[],...autonomousDefaults()};continue;}
    if(!state)continue;
    if(e.type==='TASK_IMPORTED'&&q.task){const i=state.tasks.findIndex(t=>t.id===q.task.id);if(i>=0)state.tasks[i]={...state.tasks[i],...q.task};else state.tasks.push(q.task);}
    else if(e.type==='TASK_TRANSITION'){const t=state.tasks.find(t=>t.id===q.taskId);if(t){t.state=q.to;Object.assign(t,q.meta||{});}}
    else if(e.type==='TASK_RECOVERED'){const t=state.tasks.find(t=>t.id===q.taskId);if(t){t.state=q.to;Object.assign(t,q.meta||{});}}
    else if(e.type==='RUN_RECORDED'&&q.run){const i=state.runs.findIndex(r=>r.id===q.run.id);if(i>=0)state.runs[i]=q.run;else state.runs.push(q.run);}
    else if(e.type==='EVIDENCE_RECORDED'&&q.evidence)state.evidence.push(q.evidence);
    else if(e.type==='DECISION_RECORDED')state.decisions.push(q);
    else if(e.type==='PROFILE_REFRESHED')state.profile=q.profile||state.profile;
    else if(e.type==='DESIGN_LOCKS_UPDATED'&&q.locks)state.locks=q.locks;
    else if(e.type==='PLAN_CREATED'&&q.plan&&!state.plans.some(x=>x.id===q.plan.id))state.plans.push(q.plan);
    else if(e.type==='PLAN_APPROVED'){const pl=state.plans.find(x=>x.id===q.planId);if(pl){pl.status='APPROVED';pl.approvedAt=q.approvedAt||pl.approvedAt;for(const t of pl.tasks||[])if(!state.tasks.some(x=>x.id===t.id))state.tasks.push({...t,proposed:false});}}
    else if(e.type==='METRIC_RECORDED'){state.metrics[q.kind]||=[];state.metrics[q.kind].push(q.item);}
    else if(e.type==='HANDOVER_INITIALIZED'){state.handover={...(state.handover||{}),status:'HANDOVER_REVIEW'};state.delivery={...(state.delivery||{}),state:'PROJECT_SETUP'};}
    else if(e.type==='HANDOVER_ACCEPTED'){
      const accepted=q.handover||{status:'READY_FOR_HANDOVER',contractHash:q.contractHash,roles:q.roles,autonomy:q.autonomy};state.handover={...(state.handover||{}),...accepted,status:'READY_FOR_HANDOVER'};state.team={...(state.team||{}),...(q.team||q.roles||{})};state.delivery={...(state.delivery||{}),...(q.delivery||{}),state:'READY_FOR_HANDOVER',authorizedGates:{...(q.delivery?.authorizedGates||{})}};state.project.protectedPaths=[...new Set([...(state.project.protectedPaths||[]),...(q.protectedPaths||LEGACY_CONTROL_PATHS)])];
    }
    else if(e.type==='PROJECT_HANDED_OVER')state.handover={...(state.handover||{}),...(q.handover||{}),status:'HANDED_OVER'};
    else if(e.type==='PROJECT_LIFECYCLE')state.delivery={...(state.delivery||{}),...(q.patch||{}),state:q.state,authorizedGates:{...(state.delivery?.authorizedGates||{}),...(q.patch?.authorizedGates||{})}};
    else if(e.type==='DELIVERY_UPDATED'&&q.patch)state.delivery={...(state.delivery||{}),...q.patch,authorizedGates:{...(state.delivery?.authorizedGates||{}),...(q.patch.authorizedGates||{})}};
    else if(e.type==='OWNER_DECISION_OPENED'&&q.decision&&!state.ownerDecisions.some(x=>x.id===q.decision.id))state.ownerDecisions.push(q.decision);
    else if(e.type==='OWNER_DECISION_RESOLVED'){
      const d=state.ownerDecisions.find(x=>x.id===q.decisionId);if(d){d.status='RESOLVED';d.resolution=q.resolution;d.note=q.note;d.resolvedAt=e.at;}state.delivery={...(state.delivery||{}),authorizedGates:{...(state.delivery?.authorizedGates||{})}};if(q.gate&&q.resolution==='approve')state.delivery.authorizedGates[q.gate]=true;if(q.resolution==='replan')state.delivery.forceReplan=true;
    }
    else if((q.kind==='intelligence'||['INTELLIGENCE_UPDATED','CONTEXT_INTELLIGENCE_USED','QUALITY_CERTIFIED'].includes(e.type))&&q.patch)state.intelligence=mergeIntelligence(state.intelligence,q.patch);
    else if(e.type==='REPAIR_EPISODE_RECORDED'&&q.episode){const i=state.repairEpisodes.findIndex(x=>x.id===q.episode.id);if(i>=0)state.repairEpisodes[i]=q.episode;else state.repairEpisodes.push(q.episode);}
    else if(q.taskId&&q.patch)replayTaskPatch(state,q);
  }
  if(!state)throw new Error('Journal does not contain replayable project initialization');writeState(migrate(state),root,{snapshot:false});appendEvent('STATE_REPLAYED',{eventCount:lines.length},root);return readState(root);
}
