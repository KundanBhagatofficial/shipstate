import { spawnSync } from 'node:child_process';
import { gitInfo } from './git.js';

function binary(name, args = ['--version']) {
  const result = spawnSync(name, args, { encoding: 'utf8', shell: false });
  return { name, available: result.status === 0, version: result.status === 0 ? `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] : null };
}

export function doctor(root = process.cwd()) {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const checks = [
    { name: 'node', available: nodeMajor >= 20, version: process.version, required: true },
    { ...binary('git'), required: true },
    { ...binary('claude'), required: false },
    { ...binary('codex'), required: false }
  ];
  const git = gitInfo(root);
  checks.push({ name: 'repository', available: git.repository === true, version: git.repository ? `${git.branch || 'detached'} @ ${git.head?.slice(0, 7)}` : git.error, required: true });
  return checks;
}
