import test from 'node:test';import assert from 'node:assert/strict';import { chooseNext,assertTransition } from '../src/core.js';
test('next requires ACCEPTED dependencies',()=>{const tasks=[{id:'A',state:'VERIFIED',priority:10,dependsOn:[]},{id:'B',state:'PENDING',priority:100,dependsOn:['A']},{id:'C',state:'PENDING',priority:5,dependsOn:[]}];assert.equal(chooseNext(tasks).id,'C');tasks[0].state='ACCEPTED';assert.equal(chooseNext(tasks).id,'B');});
test('agent cannot jump directly to verified',()=>assert.throws(()=>assertTransition('RUNNING','VERIFIED')));
