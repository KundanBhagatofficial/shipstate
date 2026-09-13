import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cleanup, tempProject } from './helpers.js';

const cli=path.resolve(new URL('../src/cli.js',import.meta.url).pathname);
function run(root,args){return spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});}

test('CLI imports contracts and reports deterministic next action',()=>{
  const root=tempProject('cli');
  try{
    const specs=path.join(root,'specs');fs.mkdirSync(specs);
    fs.writeFileSync(path.join(specs,'TASK-001.md'),'# First task\n\nID: TASK-001\nPriority: 10\n\n## Objective\nDo first.\n\n## Verification\n- node -e "process.exit(0)"\n');
    let result=run(root,['import','specs']);assert.equal(result.status,0,result.stderr);
    result=run(root,['next']);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/TASK-001/);
    result=run(root,['status','--json']);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).next.id,'TASK-001');
  } finally {cleanup(root)}
});
