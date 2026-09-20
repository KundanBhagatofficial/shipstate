import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import { tempRepo } from './helpers.js';
import { initStore } from '../src/store.js';
import { ensureProjectKit,readProjectContract,writeProjectContract } from '../src/project-kit.js';
import { deriveQualityProfile,adviseUi,certifyQuality } from '../src/quality.js';
import { webDiscoverabilityProvider } from '../src/providers/discoverability/web-native.js';

test('quality profile derives web/mobile expectations without making optional providers mandatory',async()=>{
 const root=tempRepo('quality');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['saas'];c.project.platforms=['web','ios'];c.project.publicSurfaces=[];writeProjectContract(c,root);const p=deriveQualityProfile(root);assert.ok(p.required.includes('accessibility'));assert.ok(p.required.includes('safe-area'));const advice=await adviseUi(root);assert.equal(advice.advisoryOnly,true);assert.ok(Array.isArray(advice.issues));
});

test('auto quality defaults do not impose frontend gates on a headless project',()=>{const root=tempRepo('quality-headless');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['service'];c.project.platforms=[];writeProjectContract(c,root);const p=deriveQualityProfile(root);assert.deepEqual(p.required,['security']);});

test('Kotlin language alone does not imply an Android delivery target',()=>{const root=tempRepo('quality-kotlin-backend');fs.rmSync(path.join(root,'package.json'));fs.writeFileSync(path.join(root,'build.gradle.kts'),'plugins { kotlin("jvm") version "2.0.0" }\n');fs.mkdirSync(path.join(root,'src','main','kotlin'),{recursive:true});initStore(root);ensureProjectKit(root);const p=deriveQualityProfile(root);assert.equal(p.android,false);assert.equal(p.required.includes('android-accessibility'),false);});

test('native discoverability checks deterministic HTML metadata',async()=>{const report=await webDiscoverabilityProvider.query({html:'<!doctype html><html><head><title>Product</title><meta name="description" content="Description"><link rel="canonical" href="https://example.test/"><meta property="og:title" content="Product"><script type="application/ld+json">{"@type":"SoftwareApplication"}</script></head><body><main>'+('Useful public product content '.repeat(10))+'</main></body></html>',checkSiteFiles:false});assert.equal(report.checks.title,true);assert.equal(report.checks.structuredData,true);assert.equal(report.checks.serverRenderedContent,true);});

test('required discoverability surface without a certifiable URL fails closed',async()=>{const root=tempRepo('discoverability');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.qualityProfiles.security='off';c.project.classes=['saas'];c.project.platforms=['web'];c.project.publicSurfaces=[{id:'marketing',kind:'web',discoverability:'required'}];for(const d of ['accessibility','responsive','browser-e2e','performance','ui-consistency'])c.qualityCertification.commands[d]=['node --version'];writeProjectContract(c,root);const q=await certifyQuality(root);assert.equal(q.passed,false);assert.match(q.reason,/no URL/i);});

test('quality certification fails closed when a required dimension has no evidence',async()=>{const root=tempRepo('quality-missing');initStore(root);ensureProjectKit(root);const c=readProjectContract(root);c.project.classes=['service'];writeProjectContract(c,root);const q=await certifyQuality(root);assert.equal(q.passed,false);assert.deepEqual(q.missingDimensions,['security']);assert.match(q.reason,/qualityCertification\.commands\.security/);});

test('configured deterministic quality commands produce release evidence',async()=>{const root=tempRepo('quality-commands');initStore(root);ensureProjectKit(root);let c=readProjectContract(root);c.project.classes=['saas'];c.project.platforms=['web'];writeProjectContract(c,root);const p=deriveQualityProfile(root);c=readProjectContract(root);for(const d of p.required)c.qualityCertification.commands[d]=['node --version'];writeProjectContract(c,root);const q=await certifyQuality(root);assert.equal(q.passed,true,JSON.stringify(q.missingDimensions));assert.equal(q.evidence.filter(e=>e.type==='quality').length,p.required.length);assert.ok(q.evidence.every(e=>e.status==='passed'));});
