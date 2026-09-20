import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempRepo } from './helpers.js';
import { initStore } from '../src/store.js';
import { ensureProjectKit,REQUIRED_DOCUMENTS,projectDocumentPath } from '../src/project-kit.js';
import { compileProjectTruth,readProjectTruth,selectProjectTruth } from '../src/project-truth.js';

test('ProjectTruth compiles deterministic provenance-bearing facts from canonical documents',()=>{
 const root=tempRepo('project-truth');initStore(root);ensureProjectKit(root);for(const doc of REQUIRED_DOCUMENTS){let body=`# ${doc.key}\n\n## Approved ${doc.key}\n- The project has a final ${doc.key} rule with enough substance for deterministic compilation.\n- The autonomous team must preserve the approved ${doc.key} boundary during implementation.\n`;if(doc.key==='features')body+=`- Authentication restores a valid persisted session before protected API startup.\n`;if(doc.key==='decisions')body+=`- PostgreSQL remains the authoritative persistence layer.\n`;fs.writeFileSync(projectDocumentPath(root,doc),body);}
 const first=compileProjectTruth(root);const second=readProjectTruth(root);assert.equal(first.contractHash,second.contractHash);assert.ok(first.requirements.some(x=>/Authentication restores/.test(x.statement)));assert.ok(first.decisions.some(x=>/PostgreSQL/.test(x.statement)));assert.ok(first.requirements.every(x=>x.source.startsWith('docs/shipstate/FEATURES.md#')));assert.deepEqual(first.requirements.map(x=>x.id),second.requirements.map(x=>x.id));const selected=selectProjectTruth('restore authentication session',root);assert.ok(selected.selected.some(x=>/Authentication restores/.test(x.statement)));
});
