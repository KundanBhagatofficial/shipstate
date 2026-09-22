import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempRepo } from './helpers.js';
import { developerPolicy,developerCandidates,failoverState,nextFallback,executeDeveloperChain } from '../src/developer-failover.js';
import { initStore,mutateDelivery,paths,replayStateFromJournal } from '../src/store.js';
import { defaultProjectContract,migrateProjectContract } from '../src/project-kit.js';

test('Claude is preferred and Codex is the default bounded developer fallback',()=>{
  const contract=defaultProjectContract(),policy=developerPolicy(contract,contract.roles);
  assert.equal(policy.preferred,'claude');
  assert.deepEqual(policy.fallbacks,['codex']);
  assert.equal(policy.probeMs,300000);
  assert.deepEqual(developerCandidates({delivery:{}},policy),['claude','codex']);
  assert.equal(nextFallback(['claude','codex'],'claude'),'codex');
});

test('active fallback avoids exhausted Claude until probe time then prefers Claude again',()=>{
  const policy={preferred:'claude',fallbacks:['codex'],probeMs:300000};
  const at=new Date('2026-09-22T18:00:00.000Z');
  const active=failoverState({preferred:'claude',active:'codex',reason:'provider_quota',probeMs:policy.probeMs,at});
  const state={delivery:{developerFailover:active}};
  assert.deepEqual(developerCandidates(state,policy,at.getTime()+60_000),['codex','claude']);
  assert.deepEqual(developerCandidates(state,policy,Date.parse(active.probeAfterAt)+1),['claude','codex']);
});

test('provider availability failure continues the same task through Codex fallback',async()=>{
  const policy={preferred:'claude',fallbacks:['codex'],probeMs:300000},calls=[],switches=[];
  const chain=await executeDeveloperChain({state:{delivery:{}},policy,run:async agent=>{calls.push(agent);return agent==='claude'?{status:'failed',providerAvailability:'provider_quota',taskId:'T1'}:{status:'passed',providerAvailability:null,taskId:'T1'};},onFailover:async event=>switches.push(event)});
  assert.deepEqual(calls,['claude','codex']);
  assert.equal(chain.agent,'codex');
  assert.equal(chain.run.status,'passed');
  assert.equal(chain.attempts.length,2);
  assert.equal(switches[0].nextAgent,'codex');
  assert.equal(switches[0].reason,'provider_quota');
});

test('active Codex fallback fails back to Claude after the probe window',async()=>{
  const policy={preferred:'claude',fallbacks:['codex'],probeMs:300000},at=new Date('2026-09-22T18:00:00.000Z');
  const active=failoverState({preferred:'claude',active:'codex',reason:'provider_quota',probeMs:policy.probeMs,at});
  const state={delivery:{developerFailover:{...active,probeAfterAt:new Date(at.getTime()-1).toISOString()}}},calls=[];
  const chain=await executeDeveloperChain({state,policy,run:async agent=>{calls.push(agent);return {status:'passed'};}});
  assert.deepEqual(calls,['claude']);
  assert.equal(chain.preferredRecovered,true);
});

test('developer failover state survives journal replay',()=>{
  const root=tempRepo('developer-failover-replay');initStore(root);
  const active=failoverState({preferred:'claude',active:'codex',reason:'provider_quota',probeMs:300000,at:new Date('2026-09-22T18:00:00.000Z')});
  mutateDelivery({developerFailover:active},'DELIVERY_UPDATED',root);
  fs.writeFileSync(paths(root).state,'{broken');
  const replayed=replayStateFromJournal(root);
  assert.deepEqual(replayed.delivery.developerFailover,active);
});

test('legacy contracts acquire fallback/failback defaults without overwriting configured roles',()=>{
  const migrated=migrateProjectContract({schemaVersion:1,roles:{manager:'custom-manager',developer:'claude'}});
  assert.equal(migrated.roles.manager,'custom-manager');
  assert.equal(migrated.roles.developer,'claude');
  assert.deepEqual(migrated.roles.developerFallbacks,['codex']);
  assert.equal(migrated.limits.developerFailbackProbeMs,300000);
});
