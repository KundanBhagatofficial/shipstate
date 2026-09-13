import fs from 'node:fs';
import path from 'node:path';
import { now } from './core.js';

function list(value = '') { return value.split(',').map((x) => x.trim()).filter(Boolean); }
function bulletsFor(section, sections) { return sections[section] ?? []; }

export function parseTaskMarkdown(text, file = 'task.md') {
  const lines = text.split(/\r?\n/);
  const title = (lines.find((line) => line.startsWith('# ')) ?? '').slice(2).trim();
  const meta = {};
  const sections = {};
  let section = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      section = line.slice(3).trim().toLowerCase();
      sections[section] ??= [];
      continue;
    }
    if (!section) {
      const match = line.match(/^([A-Za-z][A-Za-z -]+):\s*(.+)$/);
      if (match) meta[match[1].toLowerCase().replace(/[ -]/g, '')] = match[2].trim();
      continue;
    }
    if (line.startsWith('- ')) sections[section].push(line.slice(2).trim());
    else if (line) sections[section].push(line);
  }

  const taskId = meta.id || path.basename(file, path.extname(file)).toUpperCase();
  const objective = bulletsFor('objective', sections).join(' ');
  return {
    id: taskId,
    title: title || taskId,
    requirement: meta.requirement || null,
    objective: objective || title || taskId,
    acceptanceCriteria: bulletsFor('acceptance criteria', sections),
    verification: bulletsFor('verification', sections),
    files: bulletsFor('files', sections),
    allowedPaths: bulletsFor('allowed paths', sections),
    protectedPaths: bulletsFor('protected paths', sections),
    notes: bulletsFor('notes', sections),
    dependsOn: list(meta.dependson),
    tags: list(meta.tags),
    priority: Number(meta.priority || 0),
    state: 'PENDING',
    createdAt: now(),
    updatedAt: now(),
    source: path.relative(process.cwd(), file)
  };
}

export function loadTaskFiles(target) {
  const stat = fs.statSync(target);
  const files = stat.isDirectory()
    ? fs.readdirSync(target).filter((file) => file.toLowerCase().endsWith('.md')).sort().map((file) => path.join(target, file))
    : [target];
  return files.map((file) => parseTaskMarkdown(fs.readFileSync(file, 'utf8'), file));
}

export function taskTemplate(id = 'TASK-001', title = 'Describe the task') {
  return `# ${title}\n\nID: ${id}\nPriority: 10\nDepends On:\nTags: feature\n\n## Objective\nDescribe the smallest independently verifiable outcome.\n\n## Acceptance Criteria\n- Observable behavior is correct\n- Existing behavior is preserved\n\n## Verification\n- npm test\n\n## Files\n- src/example.js\n\n## Allowed Paths\n- src/**\n- test/**\n\n## Protected Paths\n- .github/**\n`;
}
