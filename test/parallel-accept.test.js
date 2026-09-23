import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo,sh } from './helpers.js';
import { initStore,addTasks,readState } from '../src/store.js';
import { runTask } from '../src/runner.js';
import { verifyTask } from '../src/verifier.js';
import { acceptTask } from '../src/actions.js';

function task(id,file,expected){return {id,title:id,objective:`update ${file}`,acceptanceCriteria:[`${file} updated`],verification:[`node -e "const fs=require('fs');if(!fs.readFileSync('${file}','utf8').includes('${expected}'))process.exit(1)"`],files:[file],allowedPaths:[file],protectedPaths:[],evidenceRequired:['command','diff'],dependsOn:[],priority:10,risk:'low',state:'PENDING'};}

test('parallel verified disjoint candidates integrate sequentially with post-integration verification',async()=>{
  const root=tempRepo('parallel-accept');
  fs.writeFileSync(path.join(root,'src','a.js'),'export const a = 1;\n');
  fs.writeFileSync(path.join(root,'src','b.js'),'export const b = 1;\n');
  sh(root,'git',['add','src/a.js','src/b.js']);sh(root,'git',['commit','-m','parallel fixtures']);
  initStore(root);addTasks([task('A','src/a.js','a = 2'),task('B','src/b.js','b = 2')],root);sh(root,'git',['add','.gitignore']);sh(root,'git',['commit','-m','shipstate metadata']);
  const ra=await runTask('A','manual',root),rb=await runTask('B','manual',root);
  fs.writeFileSync(path.join(ra.worktreePath,'src','a.js'),'export const a = 2;\n');
  fs.writeFileSync(path.join(rb.worktreePath,'src','b.js'),'export const b = 2;\n');
  assert.equal(verifyTask('A',root).passed,true);assert.equal(verifyTask('B',root).passed,true);
  const aa=acceptTask('A',root,'test');assert.equal(aa.staleRevalidated,false);
  const ab=acceptTask('B',root,'test',{allowDisjointStale:true,postVerify:true});assert.equal(ab.staleRevalidated,true);
  assert.equal(readState(root).tasks.find(t=>t.id==='B').state,'ACCEPTED');
  assert.match(fs.readFileSync(path.join(root,'src','a.js'),'utf8'),/a = 2/);assert.match(fs.readFileSync(path.join(root,'src','b.js'),'utf8'),/b = 2/);
  assert.ok(readState(root).evidence.some(e=>e.taskId==='B'&&e.phase==='post-integration'&&e.status==='passed'));
});

test('parallel stale acceptance still rejects overlapping intervening changes',async()=>{
  const root=tempRepo('parallel-overlap');initStore(root);addTasks([task('A','src/app.js','first')],root);sh(root,'git',['add','.gitignore']);sh(root,'git',['commit','-m','shipstate metadata']);
  const run=await runTask('A','manual',root);fs.writeFileSync(path.join(run.worktreePath,'src','app.js'),'export const greeting = () => "first";\n');assert.equal(verifyTask('A',root).passed,true);
  fs.writeFileSync(path.join(root,'src','app.js'),'export const greeting = () => "main moved";\n');sh(root,'git',['add','src/app.js']);sh(root,'git',['commit','-m','intervening overlap']);
  assert.throws(()=>acceptTask('A',root,'test',{allowDisjointStale:true,postVerify:true}),/overlaps intervening main changes/);assert.equal(readState(root).tasks.find(t=>t.id==='A').state,'VERIFIED');
});
