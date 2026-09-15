import fs from 'node:fs';
import path from 'node:path';
import { id,now,ensureDir,estimateTokens } from './utils.js';
import { paths,readState,recordDecision } from './store.js';
import { readProjectContract,readProjectDocuments } from './project-kit.js';
import { commandForPrompt,executableInfo,authStatus,requiresMacKeychain } from './agents.js';
import { sandboxCommand,sanitizedEnv } from './sandbox.js';
import { executeProcess } from './runtime.js';
import { run } from './utils.js';

function clip(text,max){const s=String(text||'');return s.length>max?`${s.slice(0,max)}\n[truncated by SHIPSTATE]`:s;}
export function extractAgentJson(output){
  const text=String(output||'').trim();const fence=text.match(/```(?:json)?\s*([\s\S]*?)```/i);if(fence){try{return JSON.parse(fence[1].trim());}catch{}}
  try{return JSON.parse(text);}catch{}
  const start=text.indexOf('{');if(start<0)throw new Error('Agent did not return JSON');for(let end=text.lastIndexOf('}');end>start;end=text.lastIndexOf('}',end-1)){try{return JSON.parse(text.slice(start,end+1));}catch{}}throw new Error('Agent returned malformed JSON');
}

export function projectTruthPackage(root=process.cwd(),{maxDocChars=24000}={}){
  const s=readState(root),contract=readProjectContract(root),docs=readProjectDocuments(root,maxDocChars);return {
    project:{name:s.project.name,profile:s.profile},
    contract:{roles:contract.roles,autonomy:contract.autonomy,limits:contract.limits,delivery:contract.delivery,decisions:contract.decisions},
    documents:docs,
    tasks:s.tasks.map(t=>({id:t.id,title:t.title,state:t.state,objective:t.objective,dependsOn:t.dependsOn||[],priority:t.priority||0,risk:t.risk||'medium,',acceptanceCriteria:t.acceptanceCriteria||[],allowedPaths:t.allowedPaths||[],managerBrief:t.managerBrief||null,reviewFeedback:t.reviewFeedback||null})),
    locks:s.locks||[],
    ownerDecisions:(s.ownerDecisions||[]).map(d=>({id:d.id,title:d.title,status:d.status,resolution:d.resolution||null})),
    delivery:s.delivery||{}
  };
}

function roleInstruction(role,payload){const common=`You are the ${role} inside SHIPSTATE's autonomous engineering team. The owner has already supplied and approved the canonical project documents. Never invent new product scope. Never change approved architecture, security, cost, deployment or release decisions. If a material decision is missing or conflicts, return OWNER_DECISION_REQUIRED instead of guessing. Return ONLY one valid JSON object, no markdown or prose outside JSON.`;
  if(role==='project-manager-preflight')return `${common}\n\nReview the handover package for material ambiguity or contradiction that would prevent autonomous development. Cosmetic implementation choices are NOT owner decisions. Output schema: {"status":"READY"|"OWNER_DECISION_REQUIRED","summary":"...","decisions":[{"title":"...","question":"...","options":["..."],"recommendation":"...","impact":"..."}]}.\n\nPACKAGE:\n${payload}`;
  if(role==='project-manager-plan')return `${common}\n\nCreate an implementation roadmap from the approved project truth and actual repository state. Decompose into bounded, dependency-aware engineering tasks. Do not repeat tasks already ACCEPTED. Prefer deterministic verification. Output schema: {"status":"PLAN"|"OWNER_DECISION_REQUIRED","summary":"...","milestones":[{"id":"M1","title":"...","objective":"..."}],"tasks":[{"id":"...","title":"...","objective":"...","milestone":"M1","acceptanceCriteria":["..."],"verification":["..."],"files":["..."],"allowedPaths":["..."],"protectedPaths":["..."],"evidenceRequired":["test","diff"],"dependsOn":["..."],"priority":100,"risk":"low|medium|high"}],"decisions":[]}. Maximum 80 new tasks per response.\n\nPACKAGE:\n${payload}`;
  if(role==='project-manager-task')return `${common}\n\nAct as project manager for the selected task. Produce the exact bounded implementation brief for the developer. Do not modify requirements. Output schema: {"status":"EXECUTE"|"OWNER_DECISION_REQUIRED","brief":"...","implementationNotes":["..."],"verificationFocus":["..."],"risks":["..."],"decisions":[]}.\n\nPACKAGE:\n${payload}`;
  if(role==='code-reviewer')return `${common}\n\nAct as senior reviewer. Review requirement satisfaction, architecture/design-lock compliance, correctness, edge cases, security, maintainability and evidence. Deterministic SHIPSTATE verification has already run but does not replace your review. Output schema: {"verdict":"APPROVE"|"REPAIR"|"REPLAN"|"OWNER_DECISION_REQUIRED","summary":"...","findings":[{"severity":"low|medium|high|critical","issue":"...","requirement":"...","file":"..."}],"repairBrief":"...","decisions":[]}. APPROVE only when no material finding remains.\n\nPACKAGE:\n${payload}`;
  if(role==='project-manager-completion')return `${common}\n\nDetermine whether the approved project is genuinely implementation-complete. Compare project truth, task/evidence state and repository state. Output schema: {"verdict":"COMPLETE"|"ADD_TASKS"|"OWNER_DECISION_REQUIRED","summary":"...","gaps":["..."],"tasks":[],"decisions":[]}. Use ADD_TASKS for implementation gaps that are within existing approved scope; use OWNER_DECISION_REQUIRED only for genuinely undelegated decisions.\n\nPACKAGE:\n${payload}`;
  throw new Error(`Unknown AI team role: ${role}`);
}

export async function runRoleAgent({role,agent='codex',payload,root=process.cwd(),timeoutMs=10*60*1000}){
  const info=executableInfo(agent);if(!info.available)throw new Error(`${agent} executable is unavailable for ${role}`);const auth=authStatus(agent);if(auth.supported&&auth.loggedIn===false)throw new Error(`${agent} is not authenticated`);
  const runId=id(`team-${role}`),dir=path.join(paths(root).runs,runId);ensureDir(dir);const prompt=roleInstruction(role,typeof payload==='string'?payload:JSON.stringify(payload,null,2));const promptPath=path.join(dir,'prompt.txt');fs.writeFileSync(promptPath,prompt);const logPath=path.join(dir,'agent.log');const base=commandForPrompt(agent,`Read the complete instruction at ${promptPath} and execute that role. Return only the requested JSON object.`);const spec=sandboxCommand(base,{worktree:dir,network:true,keychainAccess:process.platform==='darwin'&&requiresMacKeychain(agent)&&auth.loggedIn===true});const result=await executeProcess({runId,cmd:spec.cmd,args:spec.args,cwd:dir,env:sanitizedEnv(),timeoutMs,logPath});if(result.exitCode!==0||result.timedOut||result.cancelled)throw new Error(`${role} ${agent} failed${result.timedOut?' (timeout)':''}: ${clip(result.stderr||result.stdout,1200)}`);const parsed=extractAgentJson(result.stdout);recordDecision({id:id('decision'),type:'ai-team-role',actor:agent,role,at:now(),runId,promptTokens:estimateTokens(prompt),result:parsed},root);return {runId,role,agent,promptPath,logPath,sandbox:spec.descriptor,result:parsed};
}

function packageWithTask(root,task,extra={}){const truth=projectTruthPackage(root,{maxDocChars:12000});return {...truth,selectedTask:task,...extra};}
export async function managerPreflight(root=process.cwd(),agent='codex'){return (await runRoleAgent({role:'project-manager-preflight',agent,payload:projectTruthPackage(root),root})).result;}
export async function managerPlan(root=process.cwd(),agent='codex'){return (await runRoleAgent({role:'project-manager-plan',agent,payload:projectTruthPackage(root),root,timeoutMs:15*60*1000})).result;}
export async function managerTaskBrief(task,root=process.cwd(),agent='codex'){return (await runRoleAgent({role:'project-manager-task',agent,payload:packageWithTask(root,task),root})).result;}
export async function reviewerDecision(task,runRec,verification,root=process.cwd(),agent='codex'){
  let patch='';if(runRec?.candidateCommit&&runRec?.worktreePath){const r=run('git',['show','--format=','--no-ext-diff',runRec.candidateCommit],{cwd:runRec.worktreePath,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status===0)patch=clip(r.stdout,60000);}const evidence=readState(root).evidence.filter(e=>e.taskId===task.id).slice(-30);return (await runRoleAgent({role:'code-reviewer',agent,payload:packageWithTask(root,task,{verification,evidence,candidatePatch:patch}),root})).result;
}
export async function managerCompletion(root=process.cwd(),agent='codex'){return (await runRoleAgent({role:'project-manager-completion',agent,payload:projectTruthPackage(root,{maxDocChars:16000}),root,timeoutMs:15*60*1000})).result;}
