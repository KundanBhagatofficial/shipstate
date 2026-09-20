import test from 'node:test';
import assert from 'node:assert/strict';
import { regressionTestPolicy,failureKind,startRepairEpisode,repairFeedback } from '../src/repair.js';
import { tempRepo } from './helpers.js';
import { initStore,readState } from '../src/store.js';

test('systematic repair classifies behavioral failures and persists evidence before repair',()=>{
 const root=tempRepo('repair');initStore(root);const task={id:'BUG-1',title:'Fix authentication state regression',objective:'Invalid refresh clears stale state',acceptanceCriteria:['stale auth state is cleared']};const failure={summary:'test expected anonymous state',stderr:'AssertionError expected anonymous',evidence:['npm test failed']};assert.equal(failureKind(failure),'test');assert.equal(regressionTestPolicy(task,failure).required,true);const ep=startRepairEpisode(task,failure,1,root);assert.equal(ep.status,'DIAGNOSING');assert.ok(ep.regressionTestRequired);assert.match(repairFeedback({...ep,rootCause:'stale state survives refresh failure',hypothesis:'clear state at refresh failure source'}),/Root cause/);assert.equal(readState(root).repairEpisodes.length,1);
});

test('pure visual polish does not blindly require a new regression test',()=>{assert.equal(regressionTestPolicy({title:'Adjust CSS spacing',objective:'visual polish only'},{summary:'padding alignment'}).required,false);});
