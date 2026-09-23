import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempRepo,sh } from './helpers.js';
import { initStore } from '../src/store.js';
import { head,worktreeFor,cleanupRecordedWorktrees } from '../src/git.js';

test('finalization cleanup removes only recorded SHIPSTATE worktrees',()=>{
  const root=tempRepo('worktree-cleanup'); initStore(root);
  const wt=worktreeFor('OLD','run-old',head(root),root);
  assert.equal(fs.existsSync(wt),true);
  const removed=cleanupRecordedWorktrees([{worktreePath:wt},{worktreePath:'/tmp/not-shipstate-owned'}],root);
  assert.deepEqual(removed,[wt]);
  assert.equal(fs.existsSync(wt),false);
  assert.doesNotMatch(sh(root,'git',['worktree','list']),/OLD-run-old/);
});
