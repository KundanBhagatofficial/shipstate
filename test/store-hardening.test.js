import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempRepo } from './helpers.js';
import { initStore,readState,writeState,appendEvent,mutateDelivery,replayStateFromJournal,paths,verifyJournal } from '../src/store.js';

test('journal mutation fails closed behind malformed JSON',()=>{
  const root=tempRepo('journal-malformed');initStore(root);
  const file=paths(root).events;fs.appendFileSync(file,'{"broken":\n');const before=fs.readFileSync(file,'utf8');
  assert.throws(()=>appendEvent('SHOULD_NOT_APPEND',{ok:true},root),/Journal mutation blocked: malformed JSON/);
  assert.equal(fs.readFileSync(file,'utf8'),before);
  assert.equal(verifyJournal(root).valid,false);
});

test('writeState never replaces last-good snapshot with corrupt current state',()=>{
  const root=tempRepo('state-prev');const initial=initStore(root);const first={...initial,project:{...initial.project,name:'known-good-current'}};writeState(first,root);
  const previousBefore=JSON.parse(fs.readFileSync(paths(root).prev,'utf8'));assert.equal(previousBefore.project.name,initial.project.name);
  fs.writeFileSync(paths(root).state,'{"project":');
  const replacement={...first,project:{...first.project,name:'replacement'}};writeState(replacement,root);
  const previousAfter=JSON.parse(fs.readFileSync(paths(root).prev,'utf8'));assert.deepEqual(previousAfter,previousBefore);
  assert.equal(readState(root).project.name,'replacement');
});

test('delivery controller mutations are replayable from the journal',()=>{
  const root=tempRepo('delivery-replay');initStore(root);
  mutateDelivery({preflightPassed:true,planBootstrapped:true,forceReplan:false,lastReplannedAt:'fixture'},'DELIVERY_UPDATED',root);
  const live=readState(root).delivery;assert.equal(live.preflightPassed,true);assert.equal(live.planBootstrapped,true);
  fs.writeFileSync(paths(root).state,'{"corrupt":true}\n');
  const replayed=replayStateFromJournal(root);
  assert.equal(replayed.delivery.preflightPassed,true);assert.equal(replayed.delivery.planBootstrapped,true);assert.equal(replayed.delivery.lastReplannedAt,'fixture');
  assert.equal(verifyJournal(root).valid,true);
});
