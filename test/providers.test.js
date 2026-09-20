import test from 'node:test';
import assert from 'node:assert/strict';
import { tempRepo } from './helpers.js';
import { initStore } from '../src/store.js';
import { ensureProjectKit } from '../src/project-kit.js';
import { providerRegistry,chooseProvider,providerHealth } from '../src/providers/index.js';

test('provider kernel registers optional capabilities and always retains builtin structural fallback',()=>{
 const root=tempRepo('providers');initStore(root);ensureProjectKit(root);const registry=providerRegistry();for(const id of ['shipstate-lite','code-review-graph','codeatlas','ui-ux-pro-max','web-native','geo-seo','gameforge'])assert.ok(registry.has(id));const structural=chooseProvider('structural-context',root,{repositoryFiles:10,languages:['javascript']});assert.equal(structural.id,'shipstate-lite');const health=providerHealth(root);assert.ok(health.find(x=>x.id==='shipstate-lite')?.detected?.available);assert.ok(health.some(x=>x.id==='code-review-graph'));
});
