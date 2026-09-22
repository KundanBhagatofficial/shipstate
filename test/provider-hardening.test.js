import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tempRepo } from './helpers.js';
import { registerProvider,queryProvider,providerHealth,clearProviderHealthCache } from '../src/providers/registry.js';

test('provider router falls back when higher-ranked optional intelligence fails',async()=>{registerProvider({id:'test-primary-failing',capabilities:['test-fallback'],readOnly:true,priority:100,detect(){return {available:true};},query(){throw new Error('simulated provider failure');}});registerProvider({id:'test-secondary-ok',capabilities:['test-fallback'],readOnly:true,priority:10,detect(){return {available:true};},query(){return {ok:true};}});const q=await queryProvider('test-fallback',{action:'test'},process.cwd());assert.equal(q.available,true);assert.equal(q.provider,'test-secondary-ok');assert.equal(q.result.ok,true);assert.equal(q.fallbackFrom[0],'test-primary-failing');});

test('provider router rejects state-mutating providers',()=>{assert.throws(()=>registerProvider({id:'unsafe-mutator',capabilities:['unsafe'],readOnly:false,detect(){return {available:true};},query(){return null;}}),/must be read-only/);});

test('provider router bounds untrusted provider output',async()=>{registerProvider({id:'test-oversize',capabilities:['test-size'],readOnly:true,priority:100,detect(){return {available:true};},query(){return {blob:'x'.repeat(2*1024*1024+100)};}});const q=await queryProvider('test-size',{},process.cwd());assert.equal(q.available,false);assert.match(q.error,/exceeds/);});

test('read-only provider executes against disposable source projection without original path backreferences',async()=>{
  const root=tempRepo('provider-isolation'),source=path.join(root,'src','app.js'),before=fs.readFileSync(source,'utf8');
  registerProvider({id:'test-source-writer',capabilities:['test-isolation'],readOnly:true,priority:100,detect(){return {available:true};},query(input,providerRoot,ctx){fs.writeFileSync(path.join(providerRoot,'src','app.js'),'MUTATED BY PROVIDER\n');fs.writeFileSync(path.join(providerRoot,'provider.tmp'),'temporary\n');const remotes=spawnSync('git',['remote','-v'],{cwd:providerRoot,encoding:'utf8'}).stdout||'';return {projection:ctx.isolation,providerRoot,dataDir:ctx.dataDir,remotes,changed:fs.readFileSync(path.join(providerRoot,'src','app.js'),'utf8')};}});
  const q=await queryProvider('test-isolation',{},root);assert.equal(q.available,true);assert.equal(q.isolation,'disposable-projection');assert.match(q.result.changed,/MUTATED BY PROVIDER/);assert.equal(fs.readFileSync(source,'utf8'),before);assert.equal(fs.existsSync(path.join(root,'provider.tmp')),false);assert.equal(q.result.providerRoot.includes(root),false);assert.equal(q.result.dataDir.includes(root),false);assert.equal(q.result.remotes.includes(root),false);
});

test('provider health probes are cached for dashboard polling',()=>{
  const root=tempRepo('provider-health-cache');let detections=0;registerProvider({id:'test-health-cache',capabilities:['test-health'],readOnly:true,priority:1,detect(){detections++;return {available:true};},query(){return {ok:true};}});clearProviderHealthCache(root);providerHealth(root);providerHealth(root);assert.equal(detections,1);providerHealth(root,{refresh:true});assert.equal(detections,2);
});
