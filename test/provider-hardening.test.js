import test from 'node:test';
import assert from 'node:assert/strict';
import { registerProvider,queryProvider } from '../src/providers/registry.js';

test('provider router falls back when higher-ranked optional intelligence fails',async()=>{registerProvider({id:'test-primary-failing',capabilities:['test-fallback'],readOnly:true,priority:100,detect(){return {available:true};},query(){throw new Error('simulated provider failure');}});registerProvider({id:'test-secondary-ok',capabilities:['test-fallback'],readOnly:true,priority:10,detect(){return {available:true};},query(){return {ok:true};}});const q=await queryProvider('test-fallback',{action:'test'},process.cwd());assert.equal(q.available,true);assert.equal(q.provider,'test-secondary-ok');assert.equal(q.result.ok,true);assert.equal(q.fallbackFrom[0],'test-primary-failing');});

test('provider router rejects state-mutating providers',()=>{assert.throws(()=>registerProvider({id:'unsafe-mutator',capabilities:['unsafe'],readOnly:false,detect(){return {available:true};},query(){return null;}}),/must be read-only/);});

test('provider router bounds untrusted provider output',async()=>{registerProvider({id:'test-oversize',capabilities:['test-size'],readOnly:true,priority:100,detect(){return {available:true};},query(){return {blob:'x'.repeat(2*1024*1024+100)};}});const q=await queryProvider('test-size',{},process.cwd());assert.equal(q.available,false);assert.match(q.error,/exceeds/);});
