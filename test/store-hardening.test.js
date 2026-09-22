import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempRepo } from './helpers.js';
import { initStore,readState,writeState,appendEvent,mutateDelivery,replayStateFromJournal,paths,verifyJournal } from '../src/store.js';

test('journal mutation and direct state writes fail closed behind malformed JSON',()=>{
  const root=tempRepo('journal-malformed'),valid=initStore(root);
  const file=paths(root).events;fs.appendFileSync(file,'{"broken":\n');const before=fs.readFileSync(file,'utf8');
  assert.throws(()=>appendEvent('SHOULD_NOT_APPEND',{ok:true},root),/Journal mutation blocked: malformed JSON/);
  assert.throws(()=>writeState(valid,root),/Journal mutation blocked: malformed JSON/);
  assert.equal(fs.readFileSync(file,'utf8'),before);
  assert.equal(verifyJournal(root).valid,false);
});

test('journal mutation fails closed when a parseable hashed event is tampered',()=>{
  const root=tempRepo('journal-tampered');initStore(root);const file=paths(root).events;
  const events=fs.readFileSync(file,'utf8').trim().split(/\n/).map(JSON.parse);events[0].payload={...(events[0].payload||{}),tampered:true};fs.writeFileSync(file,events.map(JSON.stringify).join('\n')+'\n');const before=fs.readFileSync(file,'utf8');
  assert.throws(()=>appendEvent('SHOULD_NOT_APPEND',{ok:true},root),/hash chain is invalid/);
  assert.equal(fs.readFileSync(file,'utf8'),before);assert.equal(verifyJournal(root).valid,false);
});

test('writeState never replaces last-good snapshot with corrupt current state',()=>{
  const root=tempRepo('state-prev');const initial=initStore(root);const first={...initial,project:{...initial.project,name:'known-good-current'}};writeState(first,root);
  const previousBefore=JSON.parse(fs.readFileSync(paths(root).prev,'utf8'));assert.equal(previousBefore.project.name,initial.project.name);
  fs.writeFileSync(paths(root).state,'{"project":');
  const replacement={...first,project:{...first.project,name:'replacement'}};writeState(replacement,root);
  const previousAfter=JSON.parse(fs.readFileSync(paths(root).prev,'utf8'));assert.deepEqual(previousAfter,previousBefore);
  assert.equal(readState(root).project.name,'replacement');
});

test('delivery controller mutations replay without replacing last-good snapshot',()=>{
  const root=tempRepo('delivery-replay');initStore(root);
  mutateDelivery({preflightPassed:true,planBootstrapped:true,forceReplan:false,lastReplannedAt:'fixture'},'DELIVERY_UPDATED',root);
  const live=readState(root).delivery;assert.equal(live.preflightPassed,true);assert.equal(live.planBootstrapped,true);const previousBefore=fs.readFileSync(paths(root).prev,'utf8');
  fs.writeFileSync(paths(root).state,'{"corrupt":true}\n');
  const replayed=replayStateFromJournal(root);
  assert.equal(replayed.delivery.preflightPassed,true);assert.equal(replayed.delivery.planBootstrapped,true);assert.equal(replayed.delivery.lastReplannedAt,'fixture');
  assert.equal(fs.readFileSync(paths(root).prev,'utf8'),previousBefore);assert.equal(verifyJournal(root).valid,true);
});
