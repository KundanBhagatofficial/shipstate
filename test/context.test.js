import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileContext } from '../src/context.js';
import { addTasks } from '../src/store.js';
import { cleanup, tempProject } from './helpers.js';

test('context compiler includes explicit and automatically discovered repository files within budget',()=>{
  const root=tempProject('context');
  try{
    fs.writeFileSync(`${root}/src/sessionRestore.js`,'export function restoreSession(){ return "session"; }\n');
    const at=new Date().toISOString();
    addTasks([{id:'AUTH-1',title:'Restore session',objective:'Restore the user session before API boot',acceptanceCriteria:['session restores'],verification:['node -e "process.exit(0)"'],files:['src/app.js'],allowedPaths:['src/**'],protectedPaths:[],dependsOn:[],priority:1,state:'PENDING',createdAt:at,updatedAt:at}],root);
    const context=compileContext('AUTH-1',root);
    assert.match(context.text,/src\/app\.js/);
    assert.ok(context.files.includes('src/sessionRestore.js'));
    assert.ok(context.estimatedTokens>0);
    assert.ok(context.bytes<=120000);
  } finally { cleanup(root); }
});
