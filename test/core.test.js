import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNext, assertTransition } from '../src/core.js';

test('next task respects dependencies and priority',()=>{
  const tasks=[
    {id:'A',state:'PENDING',priority:10,dependsOn:[]},
    {id:'B',state:'PENDING',priority:100,dependsOn:['A']},
    {id:'C',state:'PENDING',priority:5,dependsOn:[]}
  ];
  assert.equal(chooseNext(tasks).id,'A');
  tasks[0].state='VERIFIED';
  assert.equal(chooseNext(tasks).id,'B');
});

test('VERIFIED cannot be entered directly from RUNNING',()=>{
  assert.throws(()=>assertTransition('RUNNING','VERIFIED'),/Invalid task transition/);
});
