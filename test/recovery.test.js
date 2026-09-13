import test from 'node:test';
import assert from 'node:assert/strict';
import { recover } from '../src/recovery.js';
import { addTasks, readState, transition } from '../src/store.js';
import { cleanup, tempProject } from './helpers.js';

test('recovery returns interrupted lifecycle states to safe resumable states',()=>{
  const root=tempProject('recovery');
  try{
    const at=new Date().toISOString();
    addTasks([{id:'T1',title:'T1',objective:'x',state:'PENDING',dependsOn:[],verification:['node -e "process.exit(0)"'],createdAt:at,updatedAt:at}],root);
    transition('T1','READY',{},root); transition('T1','RUNNING',{},root);
    const actions=recover(root);
    assert.equal(actions[0].to,'FAILED');
    assert.equal(readState(root).tasks[0].state,'FAILED');
  } finally { cleanup(root); }
});
