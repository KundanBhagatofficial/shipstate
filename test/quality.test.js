import test from 'node:test';
import assert from 'node:assert/strict';
import { tempRepo } from './helpers.js';
import { initStore } from '../src/store.js';
import { ensureProjectKit,readProjectContract,writeProjectContract } from '../src/project-kit.js';
import { deriveQualityProfile,adviseUi,certifyQuality } from '../src/quality.js';
import { webDiscoverabilityProvider } from '../src/providers/discoverability/web-native.js';

test('quality profile derives web/mobile expectations without making optional providers mandatory',async()=>{
 const root=tempRepo('quality');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['saas'];c.project.platforms=['web','ios'];c.project.publicSurfaces=[];writeProjectContract(c,root);const p=deriveQualityProfile(root);assert.ok(p.required.includes('accessibility'));assert.ok(p.required.includes('responsive'));assert.ok(p.required.includes('performance'));assert.ok(p.required.includes('safe-area'));const advice=await adviseUi(root);assert.equal(advice.advisoryOnly,true);assert.ok(Array.isArray(advice.issues));
});

test('auto quality defaults do not impose frontend gates on a headless project',()=>{
 const root=tempRepo('quality-headless');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['service'];c.project.platforms=[];writeProjectContract(c,root);const p=deriveQualityProfile(root);assert.deepEqual(p.required,['security']);
});

test('native discoverability checks deterministic HTML metadata',async()=>{const report=await webDiscoverabilityProvider.query({html:'<!doctype html><html><head><title>Product</title><meta name="description" content="Description"><link rel="canonical" href="https://example.test/"><meta property="og:title" content="Product"><script type="application/ld+json">{"@type":"SoftwareApplication"}</script></head><body><main>'+('Useful public product content '.repeat(10))+'</main></body></html>',checkSiteFiles:false});assert.equal(report.checks.title,true);assert.equal(report.checks.structuredData,true);assert.equal(report.checks.serverRenderedContent,true);});

test('required discoverability surface without a certifiable URL fails closed',async()=>{const root=tempRepo('discoverability');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['saas'];c.project.platforms=['web'];c.project.publicSurfaces=[{id:'marketing',kind:'web',discoverability:'required'}];writeProjectContract(c,root);const q=await certifyQuality(root);assert.equal(q.passed,false);assert.match(q.reason,/no URL/i);});
