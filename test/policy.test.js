import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateChangedFiles, matchesAny } from '../src/policy.js';

test('glob policy handles recursive and basename matches',()=>{
  assert.equal(matchesAny('src/auth/session.js',['src/**']),true);
  assert.equal(matchesAny('.env.local',['.env.*']),true);
  assert.equal(matchesAny('README.md',['src/**']),false);
});

test('changed file policy blocks protected and outside-allowed paths',()=>{
  const result=evaluateChangedFiles(['src/a.js','README.md','.env'],{allowedPaths:['src/**'],protectedPaths:[]},{});
  assert.equal(result.ok,false);
  assert.deepEqual(result.violations.map(x=>x.reason),['outside_allowed_paths','protected_path']);
});
