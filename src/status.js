import { chooseNext, readiness, summarizeTasks } from './core.js';
import { gitInfo } from './git.js';
import { readEvents, readState } from './store.js';

export function projectStatus(root = process.cwd()) {
  const state = readState(root);
  const next = chooseNext(state.tasks);
  return {
    project: state.project,
    readiness: readiness(state.tasks),
    counts: summarizeTasks(state.tasks),
    next,
    blockers: state.tasks.filter((task) => task.state === 'BLOCKED'),
    active: state.tasks.filter((task) => ['RUNNING','IMPLEMENTED','VERIFYING','VERIFIED','ACCEPTING'].includes(task.state)),
    recentRuns: state.runs.slice(-10).reverse(),
    recentEvents: readEvents(root, 20).reverse(),
    git: gitInfo(root)
  };
}
