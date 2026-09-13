import fs from 'node:fs';
import path from 'node:path';
import { paths, readState } from './store.js';
import { hash } from './core.js';

function safeRead(file) { try { return fs.readFileSync(file,'utf8'); } catch { return ''; } }
function recentFailures(taskId,state) { return state.runs.filter(r=>r.taskId===taskId && r.status!=='passed').slice(-3); }
export function compileContext(taskId,root=process.cwd()) {
  const s=readState(root); const task=s.tasks.find(t=>t.id===taskId); if(!task) throw new Error(`Unknown task: ${taskId}`);
  const chunks=[`# SHIPSTATE Execution Context\n`,`## Task\n${task.id}: ${task.title}\n`,`## Objective\n${task.objective||task.title}\n`];
  if(task.acceptanceCriteria?.length) chunks.push(`## Acceptance Criteria\n${task.acceptanceCriteria.map(x=>`- ${x}`).join('\n')}\n`);
  if(task.dependsOn?.length) chunks.push(`## Verified Dependencies\n${task.dependsOn.map(x=>`- ${x}`).join('\n')}\n`);
  if(task.files?.length) {
    chunks.push('## Explicit Repository Context\n');
    for(const rel of task.files) { const abs=path.resolve(root,rel); const content=safeRead(abs); chunks.push(`### ${rel}\n\`\`\`\n${content.slice(0,12000)}\n\`\`\`\n`); }
  }
  const failures=recentFailures(taskId,s); if(failures.length) chunks.push(`## Previous Failed Attempts\n${failures.map(r=>`- ${r.id}: ${r.failureFingerprint||r.status} (${r.agent})`).join('\n')}\n`);
  chunks.push(`## Constraints\n- Work only on this task.\n- Preserve unrelated behavior.\n- Do not claim VERIFIED; SHIPSTATE verification owns that transition.\n`);
  const text=chunks.join('\n'); const out=path.join(paths(root).contexts,`${taskId}.md`); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,text);
  return {path:out,text,hash:hash(text),bytes:Buffer.byteLength(text)};
}
