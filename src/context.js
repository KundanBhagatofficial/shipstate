import fs from 'node:fs';
import path from 'node:path';
import { paths, readConfig, readState } from './store.js';
import { hash } from './core.js';

const TEXT_EXTENSIONS = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.css','.html','.yml','.yaml','.toml','.py','.go','.rs','.java','.kt','.swift','.sh']);
const IGNORE_DIRS = new Set(['.git','.shipstate','node_modules','dist','build','coverage','.next','.turbo','vendor']);

function safeRead(file, max = 16000) {
  try { return fs.readFileSync(file, 'utf8').slice(0, max); } catch { return ''; }
}

function walk(root, current = root, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, absolute, out);
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(path.relative(root, absolute));
    if (out.length >= 2500) break;
  }
  return out;
}

function keywords(task) {
  return `${task.title} ${task.objective} ${(task.acceptanceCriteria ?? []).join(' ')}`
    .toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g)?.filter((value) => !['with','from','this','that','should','must','into','when','then','only','task'].includes(value)).slice(0, 20) ?? [];
}

function autoDiscover(task, root, limit = 8) {
  const words = keywords(task);
  if (!words.length) return [];
  const scored = [];
  for (const rel of walk(root)) {
    const lowerName = rel.toLowerCase();
    const content = safeRead(path.join(root, rel), 24000).toLowerCase();
    let score = 0;
    for (const word of words) {
      if (lowerName.includes(word)) score += 5;
      const matches = content.split(word).length - 1;
      score += Math.min(matches, 3);
    }
    if (score > 0) scored.push({ rel, score });
  }
  return scored.sort((a,b) => b.score - a.score || a.rel.localeCompare(b.rel)).slice(0, limit).map((item) => item.rel);
}

function recentRuns(taskId, state) {
  return state.runs.filter((run) => run.taskId === taskId).slice(-5);
}

export function compileContext(taskId, root = process.cwd(), sourceRoot = root) {
  const state = readState(root);
  const config = readConfig(root);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  const explicit = task.files ?? [];
  const discovered = autoDiscover(task, sourceRoot).filter((file) => !explicit.includes(file));
  const selected = [...explicit, ...discovered].slice(0, 14);
  const chunks = [
    '# SHIPSTATE Execution Context\n',
    `Project: ${state.project.name}\nTask: ${task.id}\nTitle: ${task.title}\nPriority: ${task.priority ?? 0}\n`,
    `## Objective\n${task.objective || task.title}\n`
  ];

  if (task.requirement) chunks.push(`## Requirement\n${task.requirement}\n`);
  if (task.acceptanceCriteria?.length) chunks.push(`## Acceptance Criteria\n${task.acceptanceCriteria.map((item) => `- ${item}`).join('\n')}\n`);
  if (task.dependsOn?.length) {
    const depLines = task.dependsOn.map((depId) => {
      const dep = state.tasks.find((item) => item.id === depId);
      return `- ${depId}: ${dep?.state ?? 'MISSING'}${dep?.acceptedCommit ? ` @ ${dep.acceptedCommit.slice(0, 12)}` : ''}`;
    });
    chunks.push(`## Integrated Dependencies\n${depLines.join('\n')}\n`);
  }
  if (task.allowedPaths?.length) chunks.push(`## Allowed Paths\n${task.allowedPaths.map((item) => `- ${item}`).join('\n')}\n`);
  if (task.protectedPaths?.length) chunks.push(`## Additional Protected Paths\n${task.protectedPaths.map((item) => `- ${item}`).join('\n')}\n`);

  const runs = recentRuns(taskId, state);
  if (runs.length) {
    chunks.push(`## Previous Attempts\n${runs.map((run) => `- ${run.id} | ${run.agent} | ${run.status} | ${run.failureFingerprint ?? 'no failure fingerprint'}${run.changedFiles?.length ? ` | changed: ${run.changedFiles.join(', ')}` : ''}`).join('\n')}\n`);
  }

  if (selected.length) {
    chunks.push('## Repository Context\n');
    for (const rel of selected) {
      const content = safeRead(path.resolve(sourceRoot, rel));
      if (!content) continue;
      chunks.push(`### ${rel}\n\`\`\`\n${content}\n\`\`\`\n`);
    }
  }

  if (task.verification?.length) chunks.push(`## Verification Contract\n${task.verification.map((item) => `- ${item}`).join('\n')}\n`);
  chunks.push('## Execution Rules\n- Work only on this task.\n- Do not modify .shipstate or .git.\n- Respect allowed/protected paths.\n- Preserve unrelated behavior.\n- Do not claim VERIFIED or ACCEPTED; SHIPSTATE owns those transitions.\n- Finish with code changes, not an explanation-only response.\n');

  let text = chunks.join('\n');
  const maxBytes = config.maxContextBytes ?? 120000;
  if (Buffer.byteLength(text) > maxBytes) text = `${text.slice(0, maxBytes - 200)}\n\n[Context truncated by SHIPSTATE budget]\n`;
  const out = path.join(paths(root).contexts, `${taskId}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  const bytes = Buffer.byteLength(text);
  return {
    path: out,
    text,
    hash: hash(text),
    bytes,
    estimatedTokens: Math.ceil(bytes / 4),
    files: selected,
    explicitFiles: explicit,
    discoveredFiles: discovered
  };
}
