import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('dashboard exposes 1.2 intelligence and token-economy surfaces',()=>{
 const html=fs.readFileSync(path.join(root,'web','index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'web','app.js'),'utf8');
 assert.match(html,/data-view="intelligence"/);
 assert.match(app,/function renderIntelligence\(/);
 assert.match(app,/Adaptive provider routing/);
 assert.match(app,/Estimated tokens avoided/);
 assert.match(app,/Quality certification/);
 assert.match(app,/Repair episodes/);
});

test('release metadata identifies 1.2 stable release',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const changelog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
 assert.equal(pkg.version,'1.2.0');
 assert.match(changelog,/## 1\.2\.0/);
});
