import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { addTasks, readEvents, readState, transition } from '../src/store.js';
import { cleanup, tempProject } from './helpers.js';

test('state is atomic/persistent and journal records transitions',()=>{
  const root=tempProject('store');
  try{
    addTasks([{id:'T1',title:'One',objective:'One',state:'PENDING',dependsOn:[],priority:1,verification:['node -e "process.exit(0)"'],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}],root);
    transition('T1','READY',{},root);
    assert.equal(readState(root).tasks[0].state,'READY');
    assert.ok(readEvents(root).some(e=>e.type==='TASK_TRANSITION'));
    assert.equal(fs.existsSync(`${root}/.shipstate/state.json`),true);
  } finally { cleanup(root); }
});

test('dependency graph rejects missing dependencies and cycles',()=>{
  const root=tempProject('deps');
  try{
    assert.throws(()=>addTasks([{id:'A',state:'PENDING',dependsOn:['MISSING'],title:'A',objective:'A',verification:[]}],root),/unknown task/);
  } finally { cleanup(root); }
});
