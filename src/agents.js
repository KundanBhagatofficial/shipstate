import { spawnSync } from 'node:child_process';

export function agentCommand(agent, contextPath) {
  const instruction = `Implement the SHIPSTATE task exactly as specified in ${contextPath}. Read the complete context first. Work only in the current repository worktree. Do not modify .shipstate or .git. Do not stop at analysis; implement the code and tests.`;
  if (agent === 'claude') return { cmd: 'claude', args: ['-p', instruction] };
  if (agent === 'codex') return { cmd: 'codex', args: ['exec', instruction] };
  if (agent === 'manual') return { cmd: process.execPath, args: ['-e', 'console.log("SHIPSTATE manual mode: edit the isolated worktree, then run shipstate verify")'] };
  if (agent === 'dry-run') return { cmd: process.execPath, args: ['-e', 'console.log("SHIPSTATE dry-run: execution envelope validated; no code changes requested")'] };
  throw new Error(`Unsupported agent: ${agent}`);
}

export function executeAgent(agent, contextPath, worktree, options = {}) {
  const spec = agentCommand(agent, contextPath);
  const spawn = options.spawn ?? spawnSync;
  const result = spawn(spec.cmd, spec.args, {
    cwd: worktree,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeoutMs ?? 30 * 60 * 1000,
    env: { ...process.env, SHIPSTATE_TASK_CONTEXT: contextPath }
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    signal: result.signal ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error?.message ?? null
  };
}
