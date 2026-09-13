import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { initStore } from '../src/store.js';

export function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

export function tempProject(name = 'shipstate-test') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  fs.writeFileSync(path.join(root, '.gitignore'), '.shipstate/\n');
  fs.writeFileSync(path.join(root, 'app.txt'), 'old\n');
  fs.mkdirSync(path.join(root, 'src')); fs.writeFileSync(path.join(root, 'src', 'app.js'), 'export const value = "old";\n');
  fs.mkdirSync(path.join(root, 'test')); fs.writeFileSync(path.join(root, 'test', 'app.test.js'), '// placeholder\n');
  git(['init','-q'], root);
  git(['config','user.name','SHIPSTATE Test'], root);
  git(['config','user.email','shipstate@test.local'], root);
  git(['add','-A'], root);
  git(['commit','-qm','initial'], root);
  initStore(root, { name: 'Test Project' });
  return root;
}

export function cleanup(root) { fs.rmSync(root, { recursive: true, force: true }); }
