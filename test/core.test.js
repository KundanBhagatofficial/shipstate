import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, chooseNext, eligible } from '../src/core.js';

const task = (id,state='PENDING',dependsOn=[],priority=0)=>({id,state,dependsOn,priority});

test('next-task selection requires ACCEPTED dependencies and honors priority',()=>{
  const tasks=[task('A','ACCEPTED'),task('B','PENDING',['A'],4),task('C','PENDING',[],9),task('D','PENDING',['B'],99)];
  assert.equal(chooseNext(tasks).id,'C');
  assert.equal(eligible(tasks[3],Object.fromEntries(tasks.map(t=>[t.id,t]))),false);
});

test('agents cannot jump directly from RUNNING to VERIFIED',()=>{
  assert.throws(()=>assertTransition('RUNNING','VERIFIED'),/Invalid task transition/);
});

test('VERIFIED can only proceed through acceptance or revision',()=>{
  assert.doesNotThrow(()=>assertTransition('VERIFIED','ACCEPTING'));
  assert.doesNotThrow(()=>assertTransition('VERIFIED','READY'));
  assert.throws(()=>assertTransition('VERIFIED','ACCEPTED'));
});
