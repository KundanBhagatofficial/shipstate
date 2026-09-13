import path from 'node:path';

export const DEFAULT_PROTECTED_PATHS = Object.freeze([
  '.git/**',
  '.shipstate/**',
  '.env',
  '.env.*'
]);

function normalize(value) {
  return value.split(path.sep).join('/').replace(/^\.\//, '');
}

export function globToRegExp(glob) {
  const normalized = normalize(glob);
  let out = '^';
  for (let i = 0; i < normalized.length; i += 1) {
    const c = normalized[i];
    const next = normalized[i + 1];
    if (c === '*' && next === '*') { out += '.*'; i += 1; continue; }
    if (c === '*') { out += '[^/]*'; continue; }
    if (c === '?') { out += '[^/]'; continue; }
    out += c.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`${out}$`);
}

export function matchesAny(file, globs = []) {
  const normalized = normalize(file);
  return globs.some((glob) => globToRegExp(glob).test(normalized));
}

export function evaluateChangedFiles(files, task, projectPolicy = {}) {
  const allowed = task.allowedPaths?.length ? task.allowedPaths : (projectPolicy.allowedPaths ?? []);
  const protectedPaths = [
    ...DEFAULT_PROTECTED_PATHS,
    ...(projectPolicy.protectedPaths ?? []),
    ...(task.protectedPaths ?? [])
  ];
  const violations = [];
  for (const file of files) {
    if (matchesAny(file, protectedPaths)) violations.push({ file, reason: 'protected_path' });
    else if (allowed.length && !matchesAny(file, allowed)) violations.push({ file, reason: 'outside_allowed_paths' });
  }
  return { ok: violations.length === 0, violations, allowed, protectedPaths };
}
