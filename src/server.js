import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compileContext } from './context.js';
import { doctor } from './doctor.js';
import { runTask } from './runner.js';
import { verifyTask } from './verifier.js';
import { acceptTask, rejectTask, unblockTask } from './actions.js';
import { recover } from './recovery.js';
import { loadTaskFiles, taskTemplate } from './spec.js';
import { addTasks, readConfig, readEvents, readState, upsertTasks, writeConfig } from './store.js';
import { projectStatus } from './status.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..', 'web');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8' };

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'content-length':Buffer.byteLength(body), 'cache-control':'no-store' });
  res.end(body);
}

function sendError(res, error, status = 400) { sendJson(res, status, { error: error.message ?? String(error) }); }

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function taskDetail(taskId, root) {
  const state = readState(root);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  return {
    task,
    runs: state.runs.filter((run) => run.taskId === taskId).reverse(),
    evidence: state.evidence.filter((item) => item.taskId === taskId).reverse(),
    decisions: state.decisions.filter((item) => item.taskId === taskId).reverse()
  };
}

function mutationAuthorized(req, token) { return req.headers['x-shipstate-token'] === token; }

function staticFile(urlPath) {
  const requested = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const absolute = path.resolve(WEB_ROOT, requested);
  return absolute.startsWith(`${WEB_ROOT}${path.sep}`) || absolute === path.join(WEB_ROOT, 'index.html') ? absolute : null;
}

export function createShipstateServer(root = process.cwd(), options = {}) {
  const token = randomUUID();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && !mutationAuthorized(req, token)) return sendError(res, new Error('Invalid SHIPSTATE mutation token'), 403);
        if (req.method === 'GET' && pathname === '/api/meta') return sendJson(res, 200, { token, version: '0.2.0-rc.1' });
        if (req.method === 'GET' && pathname === '/api/state') return sendJson(res, 200, readState(root));
        if (req.method === 'GET' && pathname === '/api/status') return sendJson(res, 200, projectStatus(root));
        if (req.method === 'GET' && pathname === '/api/events') return sendJson(res, 200, readEvents(root, Math.min(Number(url.searchParams.get('limit') || 200), 1000)).reverse());
        if (req.method === 'GET' && pathname === '/api/doctor') return sendJson(res, 200, doctor(root));
        if (req.method === 'GET' && pathname === '/api/config') return sendJson(res, 200, readConfig(root));
        if (req.method === 'GET' && pathname === '/api/template') return sendJson(res, 200, { template: taskTemplate() });
        const taskMatch = pathname.match(/^\/api\/task\/([^/]+)$/);
        if (req.method === 'GET' && taskMatch) return sendJson(res, 200, taskDetail(taskMatch[1], root));

        const body = await readBody(req);
        if (req.method === 'POST' && pathname === '/api/import') {
          if (!body.target) throw new Error('target is required');
          const tasks = loadTaskFiles(path.resolve(root, body.target));
          const state = body.upsert ? upsertTasks(tasks, root) : addTasks(tasks, root);
          return sendJson(res, 200, { imported: tasks.length, tasks: state.tasks });
        }
        if (req.method === 'POST' && pathname === '/api/config') {
          writeConfig({ ...readConfig(root), ...body }, root);
          return sendJson(res, 200, readConfig(root));
        }
        if (req.method === 'POST' && pathname === '/api/recover') return sendJson(res, 200, { actions: recover(root, { prune: Boolean(body.prune) }) });

        const actionMatch = pathname.match(/^\/api\/task\/([^/]+)\/(context|run|verify|accept|reject|unblock)$/);
        if (req.method === 'POST' && actionMatch) {
          const [, taskId, action] = actionMatch;
          if (action === 'context') return sendJson(res, 200, compileContext(taskId, root));
          if (action === 'run') return sendJson(res, 200, runTask(taskId, body.agent || readConfig(root).defaultAgent, root));
          if (action === 'verify') return sendJson(res, 200, verifyTask(taskId, root));
          if (action === 'accept') return sendJson(res, 200, acceptTask(taskId, root));
          if (action === 'reject') return sendJson(res, 200, rejectTask(taskId, body.reason || 'rejected_from_dashboard', root));
          if (action === 'unblock') return sendJson(res, 200, unblockTask(taskId, root));
        }
        return sendError(res, new Error('Not found'), 404);
      }

      const file = staticFile(pathname);
      if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return sendError(res, new Error('Not found'), 404);
      const body = fs.readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'content-length':body.length, 'cache-control':'no-store' });
      res.end(body);
    } catch (error) {
      sendError(res, error, 500);
    }
  });
  return { server, token };
}

export function startServer(root = process.cwd(), options = {}) {
  const config = readConfig(root);
  const host = options.host ?? config.server?.host ?? '127.0.0.1';
  const port = options.port ?? config.server?.port ?? 4317;
  const { server, token } = createShipstateServer(root, options);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({ server, token, host, port: typeof address === 'object' ? address.port : port, url: `http://${host}:${typeof address === 'object' ? address.port : port}` });
    });
  });
}
