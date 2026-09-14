#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import { spawn } from 'node:child_process';
import { initStore,initialized,readState,addTasks,refreshProfile,verifyJournal,backupState,replayStateFromJournal } from './store.js';
import { loadTaskFiles,taskTemplate } from './spec.js';import { chooseNext } from './core.js';import { compileContext } from './context.js';import { runTask,cancelRun } from './runner.js';import { verifyTask } from './verifier.js';import { acceptTask,rejectTask,unblockTask } from './actions.js';import { doctor } from './doctor.js';import { recover } from './recovery.js';import { projectStatus } from './status.js';import { createServer } from './server.js';import { analytics } from './analytics.js';import { initWorkspace,addRepository,workspaceStatus } from './workspace.js';import { autopilot } from './scheduler.js';import { importLocks } from './design-lock.js';import { planFromDocuments,approvePlan } from './planner.js';import { githubStatus,createPullRequest,prView,prChecks } from './github.js';import { listProjects,registerProject } from './projects.js';import { remoteDoctor } from './remote.js';import { certifyAgent } from './certify-agent.js';import { writeIntegration,callIntegration } from './integrations.js';
const argv=process.argv.slice(2),cmd=argv.shift();const flag=n=>argv.find(x=>x.startsWith(`--${n}=`))?.split('=').slice(1).join('=');const has=n=>argv.includes(`--${n}`);function need(){if(!initialized())throw new Error('Not initialized. Run: shipstate init');}const json=x=>console.log(JSON.stringify(x,null,2));
function openBrowser(url){const [c,a]=process.platform==='darwin'?['open',[url]]:process.platform==='win32'?['cmd',['/c','start','',url]]:['xdg-open',[url]];spawn(c,a,{detached:true,stdio:'ignore'}).unref();}
async function main(){
 if(cmd==='init'){const s=initStore(process.cwd(),flag('name'));registerProject(process.cwd(),s.project.name);json({project:s.project,profile:s.profile});return;}
 if(cmd==='profile'){need();json(refreshProfile());return;}
 if(cmd==='template'){console.log(taskTemplate(argv[0]||'TASK-001',argv.slice(1).join(' ')||'New task'));return;}
 if(cmd==='import'){need();const target=argv[0];if(!target)throw new Error('Usage: shipstate import <file|directory>');json({imported:addTasks(loadTaskFiles(path.resolve(target))).tasks.length});return;}
 if(cmd==='status'){need();json(projectStatus());return;}
 if(cmd==='next'){need();json(chooseNext(readState().tasks));return;}
 if(cmd==='context'){need();json(compileContext(argv[0],process.cwd(),{budgetTokens:Number(flag('tokens')||0)||undefined}));return;}
 if(cmd==='run'){need();json(await runTask(argv[0],flag('agent')||readState().project.defaultAgent||'manual',process.cwd(),{timeoutMs:Number(flag('timeout')||0)||undefined}));return;}
 if(cmd==='cancel'){need();json({cancelled:cancelRun(argv[0])});return;}
 if(cmd==='verify'){need();json(verifyTask(argv[0],process.cwd(),{remoteHost:flag('remote')}));return;}
 if(cmd==='accept'){need();json(acceptTask(argv[0]));return;}
 if(cmd==='reject'){need();json(rejectTask(argv[0],flag('reason')||'rejected'));return;}
 if(cmd==='unblock'){need();json(unblockTask(argv[0]));return;}
 if(cmd==='recover'){need();json(recover());return;}
 if(cmd==='history'){need();const id=argv[0],s=readState();json({runs:s.runs.filter(r=>r.taskId===id),evidence:s.evidence.filter(e=>e.taskId===id),decisions:s.decisions.filter(d=>d.taskId===id)});return;}
 if(cmd==='autopilot'){need();json(await autopilot({agent:flag('agent'),maxTasks:Number(flag('max')||10),parallel:Number(flag('parallel')||1),maxAttempts:Number(flag('attempts')||2),autoAccept:!has('no-auto-accept')}));return;}
 if(cmd==='locks'){need();if(argv[0]==='import')json(importLocks(argv[1]));else json(readState().locks);return;}
 if(cmd==='plan'){need();if(argv[0]==='approve')json(approvePlan(argv[1]));else json(planFromDocuments(argv));return;}
 if(cmd==='github'){need();if(argv[0]==='status')json(githubStatus());else if(argv[0]==='pr-create')json(createPullRequest({title:flag('title')||'SHIPSTATE candidate',body:flag('body')||'',base:flag('base'),head:flag('head'),draft:has('draft')}));else if(argv[0]==='pr-view')json(prView(argv[1]));else if(argv[0]==='pr-checks')console.log(prChecks(argv[1]));else throw new Error('github status|pr-create|pr-view|pr-checks');return;}
 if(cmd==='analytics'){need();json(analytics());return;}
 if(cmd==='projects'){json(listProjects());return;}
 if(cmd==='workspace'){if(argv[0]==='init')json(initWorkspace(flag('name')));else if(argv[0]==='add')json(addRepository(argv[1],flag('alias')));else if(argv[0]==='status')json(workspaceStatus());else throw new Error('workspace init|add|status');return;}
 if(cmd==='remote'){if(argv[0]==='doctor')json(remoteDoctor(argv[1]));else throw new Error('remote doctor <host>');return;}
 if(cmd==='integration'){need();if(argv[0]==='invoke')json(callIntegration(argv[1],argv[2]||'test',argv[3]?JSON.parse(fs.readFileSync(argv[3],'utf8')):{},process.cwd()));else json({path:writeIntegration(argv[0],JSON.parse(fs.readFileSync(argv[1],'utf8')))});return;}
 if(cmd==='state'){need();if(argv[0]==='verify')json(verifyJournal());else if(argv[0]==='backup')json({path:backupState()});else if(argv[0]==='replay')json(replayStateFromJournal());else throw new Error('state verify|backup|replay');return;}
 if(cmd==='certify-agent'){json(await certifyAgent(argv[0]));return;}
 if(cmd==='doctor'){for(const x of doctor())console.log(`${x.available?'✓':'○'} ${x.name.padEnd(10)} ${x.version||''}`);return;}
 if(cmd==='serve'){need();const port=Number(flag('port')||4317),host=flag('host')||'127.0.0.1';const app=createServer({root:process.cwd(),host,port});const info=await app.listen();const url=`${info.url}/#token=${info.token}`;console.log(`SHIPSTATE ${info.url}\nMutation token: ${info.token}`);if(has('open'))openBrowser(url);return;}
 console.log(`SHIPSTATE 1.0 RC\n\nCommands:\n  init [--name=]\n  profile\n  template <ID> <title>\n  import <file|dir>\n  status | next | context <TASK>\n  run <TASK> [--agent=manual|dry-run|claude|codex] [--timeout=ms]\n  cancel <RUN> | verify <TASK> [--remote=user@host] | accept <TASK> | reject <TASK> | unblock <TASK>\n  history <TASK> | recover\n  autopilot [--agent=] [--max=] [--parallel=]\n  locks import <file>\n  plan <docs...> | plan approve <PLAN>\n  github status|pr-create|pr-view|pr-checks\n  projects | analytics\n  workspace init|add|status\n  remote doctor <host>\n  integration <codeAtlas|gameForge> <json> | integration invoke <name> <event> [payload.json]\n  state verify|backup|replay\n  certify-agent <claude|codex>\n  doctor\n  serve [--open] [--port=4317]`);
}
main().catch(e=>{console.error(`shipstate: ${e.message}`);process.exitCode=1;});
