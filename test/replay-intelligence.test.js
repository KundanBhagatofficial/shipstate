import test from 'node:test';
import assert from 'node:assert/strict';
import { tempRepo } from './helpers.js';
import { initStore,recordIntelligence,replayStateFromJournal } from '../src/store.js';

test('journal replay preserves nested intelligence across named intelligence events',()=>{
 const root=tempRepo('intelligence-replay');initStore(root);
 recordIntelligence({providers:{structural:{id:'code-review-graph',available:true}},quality:{profile:{required:['security']}}},'CONTEXT_INTELLIGENCE_USED',root);
 recordIntelligence({providers:{ui:{id:'ui-ux-pro-max',available:true}},quality:{passed:true,lastCertifiedAt:'2026-09-20T00:00:00.000Z'}},'QUALITY_CERTIFIED',root);
 const replayed=replayStateFromJournal(root);
 assert.equal(replayed.intelligence.providers.structural.id,'code-review-graph');
 assert.equal(replayed.intelligence.providers.ui.id,'ui-ux-pro-max');
 assert.deepEqual(replayed.intelligence.quality.profile.required,['security']);
 assert.equal(replayed.intelligence.quality.passed,true);
});
