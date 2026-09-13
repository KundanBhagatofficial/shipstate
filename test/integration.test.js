import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initStore, addTasks, readState, transition } from '../src/store.js';
import { chooseNext, now } from '../src/core.js';
import { verifyTask } from '../src/verifier.js';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-'));}
function task(id,deps=[]){return {id,title:id,objective:id,acceptanceCriteria:[],verification:[`${process.execPath} -e "process.exit(0)"`],files:[],dependsOn:deps,priority:1,state:'PENDING',createdAt:now(),updatedAt:now()};}

test('verification is the only path to VERIFIED and unlocks dependency',()=>{
  const root=temp(); initStore(root); addTasks([task('A'),task('B',['A'])],root);
  assert.equal(chooseNext(readState(root).tasks).id,'A');
  transition('A','READY',{},root); transition('A','RUNNING',{},root); transition('A','IMPLEMENTED',{},root);
  assert.equal(chooseNext(readState(root).tasks),null);
  assert.equal(verifyTask('A',root).passed,true);
  assert.equal(readState(root).tasks.find(t=>t.id==='A').state,'VERIFIED');
  assert.equal(chooseNext(readState(root).tasks).id,'B');
  assert.ok(fs.readFileSync(path.join(root,'.shipstate','events.jsonl'),'utf8').includes('EVIDENCE_RECORDED'));
});
