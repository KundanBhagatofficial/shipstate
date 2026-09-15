import test from 'node:test';
import assert from 'node:assert/strict';
import { tempRepo } from './helpers.js';
import { initStore,readState } from '../src/store.js';
import { extractAgentJson } from '../src/agent-team.js';
import { normalizeManagerPlan } from '../src/delivery.js';
import { addOwnerDecision,resolveOwnerDecision } from '../src/handover.js';

test('AI team JSON parser accepts fenced and plain structured decisions',()=>{assert.deepEqual(extractAgentJson('```json\n{"status":"READY"}\n```'),{status:'READY'});assert.deepEqual(extractAgentJson('prefix\n{"verdict":"APPROVE","summary":"ok"}\nsuffix'),{verdict:'APPROVE',summary:'ok'});assert.throws(()=>extractAgentJson('not-json'),/JSON/);});

test('manager plan is normalized and unknown dependencies are rejected',()=>{const state={tasks:[],profile:{}};const plan=normalizeManagerPlan({status:'PLAN',summary:'roadmap',tasks:[{id:'core 1',title:'Core',objective:'Implement core',acceptanceCriteria:['works'],dependsOn:[],risk:'LOW'},{id:'UI-2',title:'UI',objective:'Implement UI',acceptanceCriteria:['renders'],dependsOn:['CORE-1']}]},state);assert.equal(plan.tasks.length,2);assert.equal(plan.tasks[0].id,'CORE-1');assert.equal(plan.tasks[0].risk,'low');assert.deepEqual(plan.tasks[1].dependsOn,['CORE-1']);assert.throws(()=>normalizeManagerPlan({status:'PLAN',tasks:[{id:'A',title:'A',acceptanceCriteria:['a'],dependsOn:['MISSING']}]},state),/unknown task/);assert.throws(()=>normalizeManagerPlan({status:'PLAN',tasks:[{id:'A',title:'A',acceptanceCriteria:['a'],dependsOn:['B']},{id:'B',title:'B',acceptanceCriteria:['b'],dependsOn:['A']}]},state),/cycle/);});

test('owner gate resolution authorizes only explicit approval',()=>{const root=tempRepo('owner-gate');initStore(root);const d=addOwnerDecision({gate:'release',title:'Release?',question:'Approve?',options:['approve','pause']},root);assert.equal(readState(root).delivery.state,'OWNER_DECISION_REQUIRED');resolveOwnerDecision(d.id,'approve','approved',root);const state=readState(root);assert.equal(state.delivery.authorizedGates.release,true);assert.equal(state.ownerDecisions[0].status,'RESOLVED');assert.equal(state.delivery.state,'PAUSED');});
