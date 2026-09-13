import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { addTasks, initStore, readState } from '../src/store.js';
import { runTask } from '../src/runner.js';
import { verifyTask } from '../src/verifier.js';
import { acceptTask } from '../src/actions.js';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-smoke-'));
function git(args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout.trim()}
function ok(label){console.log(`✓ ${label}`)}
try{
  fs.writeFileSync(path.join(root,'.gitignore'),'.shipstate/\n');
  fs.writeFileSync(path.join(root,'app.txt'),'before\n');
  git(['init','-q']);git(['config','user.name','SHIPSTATE Smoke']);git(['config','user.email','shipstate@local']);git(['add','-A']);git(['commit','-qm','initial']);
  initStore(root,{name:'Smoke Project'});ok('project initialized');
  const at=new Date().toISOString();
  addTasks([{id:'SMOKE-001',title:'Change app marker',objective:'Change app.txt to after',acceptanceCriteria:['app.txt contains after'],verification:[`node -e "const fs=require('fs');process.exit(fs.readFileSync('app.txt','utf8').includes('after')?0:1)"`],files:['app.txt'],allowedPaths:['app.txt'],protectedPaths:[],dependsOn:[],priority:10,state:'PENDING',createdAt:at,updatedAt:at}],root);ok('task imported');
  const run=runTask('SMOKE-001','manual',root);ok('isolated worktree created');
  fs.writeFileSync(path.join(run.worktreePath,'app.txt'),'after\n');
  const verify=verifyTask('SMOKE-001',root);if(!verify.passed)throw new Error('verification failed');ok('evidence verification passed');
  if(fs.readFileSync(path.join(root,'app.txt'),'utf8')!=='before\n')throw new Error('main tree polluted before acceptance');ok('main tree remained isolated');
  acceptTask('SMOKE-001',root);
  if(fs.readFileSync(path.join(root,'app.txt'),'utf8')!=='after\n')throw new Error('candidate not applied');
  if(readState(root).tasks[0].state!=='ACCEPTED')throw new Error('task did not reach ACCEPTED');ok('verified candidate accepted into branch');
  console.log('\nSHIPSTATE smoke: PASS');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
