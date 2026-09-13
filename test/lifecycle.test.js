import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { acceptTask } from '../src/actions.js';
import { runTask } from '../src/runner.js';
import { verifyTask } from '../src/verifier.js';
import { addTasks, readState } from '../src/store.js';
import { cleanup, tempProject } from './helpers.js';

function baseTask(id, extra={}) { const at=new Date().toISOString(); return {id,title:id,objective:'Change app text',acceptanceCriteria:['app.txt contains new'],verification:[`node -e "const fs=require('fs');process.exit(fs.readFileSync('app.txt','utf8').includes('new')?0:1)"`],files:['app.txt'],allowedPaths:['app.txt'],protectedPaths:[],dependsOn:[],priority:1,state:'PENDING',createdAt:at,updatedAt:at,...extra}; }

test('isolated run -> verify -> candidate -> accept lifecycle',()=>{
  const root=tempProject('lifecycle');
  try{
    addTasks([baseTask('T1')],root);
    const run=runTask('T1','dry-run',root);
    assert.equal(readState(root).tasks[0].state,'IMPLEMENTED');
    assert.equal(fs.readFileSync(path.join(root,'app.txt'),'utf8'),'old\n');
    fs.writeFileSync(path.join(run.worktreePath,'app.txt'),'new\n');
    const verified=verifyTask('T1',root);
    assert.equal(verified.passed,true);
    assert.ok(verified.candidate.commit);
    assert.equal(readState(root).tasks[0].state,'VERIFIED');
    assert.equal(fs.readFileSync(path.join(root,'app.txt'),'utf8'),'old\n');
    const accepted=acceptTask('T1',root);
    assert.equal(accepted.applied,true);
    assert.equal(readState(root).tasks[0].state,'ACCEPTED');
    assert.equal(fs.readFileSync(path.join(root,'app.txt'),'utf8'),'new\n');
    assert.equal(fs.existsSync(run.worktreePath),false);
  } finally { cleanup(root); }
});

test('dependent task cannot execute until dependency is ACCEPTED',()=>{
  const root=tempProject('dependency-lifecycle');
  try{
    addTasks([baseTask('A'),baseTask('B',{dependsOn:['A'],allowedPaths:['src/**'],verification:['node -e "process.exit(0)"']})],root);
    assert.throws(()=>runTask('B','dry-run',root),/dependencies must be ACCEPTED/);
    const run=runTask('A','dry-run',root); fs.writeFileSync(path.join(run.worktreePath,'app.txt'),'new\n'); verifyTask('A',root); acceptTask('A',root);
    assert.doesNotThrow(()=>runTask('B','dry-run',root));
  } finally { cleanup(root); }
});

test('verification blocks changed files outside task policy',()=>{
  const root=tempProject('policy-lifecycle');
  try{
    addTasks([baseTask('T1',{allowedPaths:['src/**'],verification:['node -e "process.exit(0)"']})],root);
    const run=runTask('T1','dry-run',root);
    fs.writeFileSync(path.join(run.worktreePath,'README.md'),'not allowed\n');
    const verified=verifyTask('T1',root);
    assert.equal(verified.passed,false);
    assert.equal(readState(root).tasks[0].state,'BLOCKED');
    assert.equal(readState(root).tasks[0].blockedReason,'policy_violation');
  } finally { cleanup(root); }
});
