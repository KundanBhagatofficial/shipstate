import test from 'node:test';import assert from 'node:assert/strict';import { parseLocks } from '../src/design-lock.js';
test('design locks support protected path syntax',()=>{const x=parseLocks('- [security] LOCK-A: paths=src/auth/** :: Auth must remain server verified');assert.equal(x[0].severity,'security');assert.deepEqual(x[0].paths,['src/auth/**']);});
