import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { acceptTask } from '../src/actions.js';
import { runTask } from '../src/runner.js';
import { verifyTask } from '../src/verifier.js';
import { addTasks, readState } from '../src/store.js';
import { cleanup, git, tempProject } from './helpers.js';

function task(id='T1'){const at=new Date().toISOString();return{id,title:id,objective:'guardrail',acceptanceCriteria:[],verification:['node -e "process.exit(0)"'],files:['app.txt'],allowedPaths:['app.txt'],protectedPaths:[],dependsOn:[],priority:1,state:'PENDING',createdAt:at,updatedAt:at}}

test('three identical agent failures trigger loop guard and BLOCKED state',()=>{
  const root=tempProject('loopguard');
  try{
    addTasks([task()],root);
    const failSpawn=()=>({status:1,stdout:'same failure at line 123',stderr:'boom code 999',signal:null});
    runTask('T1','dry-run',root,{spawn:failSpawn});
    runTask('T1','dry-run',root,{spawn:failSpawn});
    runTask('T1','dry-run',root,{spawn:failSpawn});
    const state=readState(root);
    assert.equal(state.tasks[0].state,'BLOCKED');
    assert.equal(state.tasks[0].blockedReason,'repeated_failure');
    assert.equal(state.runs.length,3);
    assert.equal(new Set(state.runs.map(r=>r.failureFingerprint)).size,1);
  } finally { cleanup(root); }
});

test('acceptance refuses stale base commit after repository HEAD moves',()=>{
  const root=tempProject('stalebase');
  try{
    addTasks([task()],root);
    const run=runTask('T1','dry-run',root);
    fs.writeFileSync(path.join(run.worktreePath,'app.txt'),'new\n');
    verifyTask('T1',root);
    fs.writeFileSync(path.join(root,'unrelated.txt'),'new head\n');
    git(['add','unrelated.txt'],root); git(['commit','-qm','move head'],root);
    assert.throws(()=>acceptTask('T1',root),/HEAD moved/);
    assert.equal(readState(root).tasks[0].state,'VERIFIED');
  } finally { cleanup(root); }
});
