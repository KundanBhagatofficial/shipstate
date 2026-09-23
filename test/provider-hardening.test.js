import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tempRepo } from './helpers.js';
import { registerProvider,queryProvider,providerHealth,clearProviderHealthCache } from '../src/providers/registry.js';

test('provider router falls back when higher-ranked optional intelligence fails',async()=>{registerProvider({id:'test-primary-failing',capabilities:['test-fallback'],readOnly:true,priority:100,detect(){return {available:true};},query(){throw new Error('simulated provider failure');}});registerProvider({id:'test-secondary-ok',capabilities:['test-fallback'],readOnly:true,priority:10,detect(){return {available:true};},query(){return {ok:true};}});const q=await queryProvider('test-fallback',{action:'test'},process.cwd());assert.equal(q.available,true);assert.equal(q.provider,'test-secondary-ok');assert.equal(q.result.ok,true);assert.equal(q.fallbackFrom[0],'test-primary-failing');});

test('provider router rejects state-mutating providers',()=>{assert.throws(()=>registerProvider({id:'unsafe-mutator',capabilities:['unsafe'],readOnly:false,detect(){return {available:true};},query(){return null;}}),/must be read-only/);});

test('provider router bounds untrusted provider output',async()=>{registerProvider({id:'test-oversize',capabilities:['test-size'],readOnly:true,priority:100,detect(){return {available:true};},query(){return {blob:'x'.repeat(2*1024*1024+100)};}});const q=await queryProvider('test-size',{},process.cwd());assert.equal(q.available,false);assert.match(q.error,/exceeds/);});

test('read-only provider fails if it mutates the disposable repository projection',async()=>{
  const root=tempRepo('provider-isolation'),source=path.join(root,'src','app.js'),before=fs.readFileSync(source,'utf8');
  registerProvider({id:'test-source-writer',capabilities:['test-isolation'],readOnly:true,priority:100,detect(){return {available:true};},query(input,providerRoot){fs.writeFileSync(path.join(providerRoot,'src','app.js'),'MUTATED BY PROVIDER\n');fs.writeFileSync(path.join(providerRoot,'provider.tmp'),'temporary\n');return {ok:true};}});
  const q=await queryProvider('test-isolation',{},root);assert.equal(q.available,false);assert.match(q.error,/violated read-only contract/);assert.equal(fs.readFileSync(source,'utf8'),before);assert.equal(fs.existsSync(path.join(root,'provider.tmp')),false);
});

test('read-only provider may persist only its dedicated cache',async()=>{
  const root=tempRepo('provider-cache');
  registerProvider({id:'test-cache-writer',capabilities:['test-cache'],readOnly:true,priority:100,detect(){return {available:true};},query(input,providerRoot,ctx){fs.mkdirSync(ctx.dataDir,{recursive:true});fs.writeFileSync(path.join(ctx.dataDir,'index.json'),'{}\n');const remotes=spawnSync('git',['remote','-v'],{cwd:providerRoot,encoding:'utf8'}).stdout||'';return {isolation:ctx.isolation,providerRoot,dataDir:ctx.dataDir,remotes};}});
  const q=await queryProvider('test-cache',{},root);assert.equal(q.available,true);assert.equal(q.isolation,'disposable-projection');assert.equal(q.result.providerRoot.includes(root),false);assert.equal(q.result.dataDir.includes(root),false);assert.equal(q.result.remotes.includes(root),false);assert.equal(fs.existsSync(path.join(root,'.shipstate','cache','providers','test-cache-writer','index.json')),true);
});

test('provider projection rejects repository symlinks that escape the disposable tree',{skip:process.platform==='win32'},async()=>{
  const root=tempRepo('provider-symlink'),external=path.join(os.tmpdir(),`shipstate-provider-external-${process.pid}-${Date.now()}.txt`);fs.writeFileSync(external,'outside\n');fs.symlinkSync(external,path.join(root,'src','escape.txt'));for(const args of [['add','src/escape.txt'],['commit','-m','add escape symlink']]){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  registerProvider({id:'test-symlink-escape',capabilities:['test-symlink'],readOnly:true,priority:100,detect(){return {available:true};},query(){return {ok:true};}});try{const q=await queryProvider('test-symlink',{},root);assert.equal(q.available,false);assert.match(q.error,/symlink escaping repository/);}finally{fs.rmSync(external,{force:true});}
});

test('provider health probes are cached for dashboard polling',()=>{
  const root=tempRepo('provider-health-cache');let detections=0;registerProvider({id:'test-health-cache',capabilities:['test-health'],readOnly:true,priority:1,detect(){detections++;return {available:true};},query(){return {ok:true};}});clearProviderHealthCache(root);providerHealth(root);providerHealth(root);assert.equal(detections,1);providerHealth(root,{refresh:true});assert.equal(detections,2);
});
