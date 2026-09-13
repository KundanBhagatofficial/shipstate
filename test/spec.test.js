import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskMarkdown } from '../src/spec.js';

test('task markdown parser extracts execution contract',()=>{
  const task=parseTaskMarkdown(`# Test\nId: TASK-X\nDepends On: TASK-A, TASK-B\nPriority: 7\n\n## Objective\nDo the thing.\n\n## Acceptance Criteria\n- It works\n\n## Verification\n- npm test\n`);
  assert.equal(task.id,'TASK-X'); assert.deepEqual(task.dependsOn,['TASK-A','TASK-B']); assert.equal(task.priority,7); assert.deepEqual(task.verification,['npm test']);
});
