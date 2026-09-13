import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskMarkdown } from '../src/spec.js';

test('parses execution contract including path policy',()=>{
  const text=`# Restore session\n\nID: AUTH-1\nPriority: 7\nDepends On: DB-1, API-2\nTags: auth, boot\n\n## Objective\nRestore before API boot.\n\n## Acceptance Criteria\n- Session restored\n\n## Verification\n- npm test\n\n## Files\n- src/auth.js\n\n## Allowed Paths\n- src/**\n- test/**\n\n## Protected Paths\n- migrations/**\n`;
  const task=parseTaskMarkdown(text,'AUTH-1.md');
  assert.equal(task.id,'AUTH-1');
  assert.deepEqual(task.dependsOn,['DB-1','API-2']);
  assert.deepEqual(task.allowedPaths,['src/**','test/**']);
  assert.deepEqual(task.protectedPaths,['migrations/**']);
  assert.deepEqual(task.tags,['auth','boot']);
});
