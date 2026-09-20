import test from 'node:test';
import assert from 'node:assert/strict';
import { tempRepo } from './helpers.js';
import { initStore,addTasks,readState } from '../src/store.js';
import { ensureProjectKit } from '../src/project-kit.js';
import { compileRoutedContext } from '../src/context-router.js';

test('Context Router emits bounded source, ProjectTruth provenance and a token receipt',async()=>{
 const root=tempRepo('context-router');initStore(root);ensureProjectKit(root);addTasks([{id:'CTX-001',title:'Change greeting',objective:'Update greeting behavior safely',acceptanceCriteria:['greeting remains tested'],verification:['npm test'],files:['src/app.js'],allowedPaths:['src/**','test/**'],protectedPaths:[],evidenceRequired:['test','diff'],dependsOn:[],priority:10,risk:'low',state:'PENDING'}],root);const ctx=await compileRoutedContext('CTX-001',root,{budgetTokens:5000});assert.ok(ctx.text.includes('Approved ProjectTruth'));assert.ok(ctx.text.includes('src/app.js'));assert.ok(ctx.receipt.projectTruth.selectedIds.length>0);assert.equal(ctx.receipt.providers.structural.id,'shipstate-lite');assert.ok(ctx.receipt.actualTokens<=5500);assert.ok(ctx.receipt.selectionReasons['src/app.js']);const s=readState(root);assert.ok(s.metrics.tokenEconomy.some(x=>x.taskId==='CTX-001'));assert.equal(s.intelligence.providers.structural.id,'shipstate-lite');
});
