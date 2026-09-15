import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempRepo,sh } from './helpers.js';
import { initStore,readState } from '../src/store.js';
import { ensureProjectKit,REQUIRED_DOCUMENTS,REQUIRED_DECISIONS,projectDocumentPath,readProjectContract,writeProjectContract } from '../src/project-kit.js';
import { handoverAudit,acceptHandover } from '../src/handover.js';

test('handover blocks incomplete project pack and accepts only completed committed decisions',()=>{
  const root=tempRepo('handover');initStore(root);ensureProjectKit(root);let audit=handoverAudit(root);assert.equal(audit.ready,false);assert.ok(audit.blockers.some(x=>x.type==='document'));assert.ok(audit.blockers.some(x=>x.type==='decision'));assert.ok(audit.blockers.some(x=>x.type==='git'));
  for(const doc of REQUIRED_DOCUMENTS){fs.writeFileSync(projectDocumentPath(root,doc),`# ${doc.key}\n\nThis approved document defines the final ${doc.key} decisions for the project. It contains sufficient implementation constraints, expected behavior, boundaries, validation rules, operational expectations, failure handling, and explicit non goals so the autonomous engineering team can execute without inventing product scope.\n\nAll material choices represented by this document are approved for autonomous implementation.\n`);}
  const contract=readProjectContract(root);for(const d of REQUIRED_DECISIONS)contract.decisions[d.key]={status:'approved',note:'approved for autonomous handover',allowNA:Boolean(d.allowNA)};writeProjectContract(contract,root);audit=handoverAudit(root);assert.equal(audit.ready,false);assert.ok(audit.blockers.some(x=>x.type==='git'));
  sh(root,'git',['add','.gitignore','docs/shipstate','shipstate.project.json']);sh(root,'git',['commit','-m','approve project handover contract']);audit=handoverAudit(root);assert.equal(audit.ready,true);const handover=acceptHandover(root);assert.equal(handover.status,'READY_FOR_HANDOVER');const state=readState(root);assert.ok(state.project.protectedPaths.includes('docs/shipstate/**'));assert.ok(state.project.protectedPaths.includes('shipstate.project.json'));assert.equal(state.delivery.state,'READY_FOR_HANDOVER');
});
