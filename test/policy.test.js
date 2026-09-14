import test from 'node:test';import assert from 'node:assert/strict';import { evaluatePaths } from '../src/policy.js';
test('protected files and out of scope files are blocked',()=>{const task={allowedPaths:['src/**'],protectedPaths:[]};const r=evaluatePaths(['src/a.js','.env.local','docs/x.md'],task,{});assert.equal(r.passed,false);assert.equal(r.violations.length,2);});
