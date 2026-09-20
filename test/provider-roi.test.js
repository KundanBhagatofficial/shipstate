import test from 'node:test';
import assert from 'node:assert/strict';
import { tempRepo } from './helpers.js';
import { initStore,recordMetric } from '../src/store.js';
import { registerProvider,chooseProvider,providerRoi } from '../src/providers/registry.js';

function dummy(id,priority){return {id,capabilities:['roi-test'],readOnly:true,priority,detect(){return {available:true};},query(){return {id};}};}

test('provider ROI adjusts automatic provider ranking from measured token savings, latency and failure rate',()=>{
 const root=tempRepo('provider-roi');initStore(root);registerProvider(dummy('roi-fast-test',50));registerProvider(dummy('roi-slow-test',55));
 assert.equal(chooseProvider('roi-test',root).id,'roi-slow-test');
 for(let i=0;i<5;i++){
   recordMetric('providers',{at:new Date().toISOString(),provider:'roi-slow-test',capability:'roi-test',latencyMs:18000,available:i<2,passed:i<2},root);
   recordMetric('providers',{at:new Date().toISOString(),provider:'roi-fast-test',capability:'roi-test',latencyMs:40,available:true,passed:true},root);
   recordMetric('contexts',{at:new Date().toISOString(),taskId:`T-${i}`,provider:'roi-fast-test',tokens:1000,tokensAvoided:9000},root);
 }
 const fast=providerRoi(root,'roi-fast-test'),slow=providerRoi(root,'roi-slow-test');
 assert.ok(fast.adjustment>0);assert.ok(slow.adjustment<0);assert.equal(chooseProvider('roi-test',root).id,'roi-fast-test');
});
