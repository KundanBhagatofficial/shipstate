import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { tempRepo } from './helpers.js';
import { initStore,addTasks,readState,writeState } from '../src/store.js';
import { initWorkspace,addRepository,addWorkspaceDependency,workspaceStatus } from '../src/workspace.js';
import { remoteExecuteWorktree } from '../src/remote.js';
function task(id,priority=10){return {id,title:id,objective:id,acceptanceCriteria:['done'],verification:['node --version'],files:[],allowedPaths:['**'],protectedPaths:[],evidenceRequired:['command'],dependsOn:[],priority,risk:'low',state:'PENDING'};}
test('workspace cross-repository dependency blocks downstream until upstream is ACCEPTED',()=>{const api=tempRepo('ws-api'),web=tempRepo('ws-web');initStore(api);initStore(web);addTasks([task('API-1',20)],api);addTasks([task('WEB-1',50)],web);const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-workspace-'));initWorkspace('product',root);addRepository(api,'api',root);addRepository(web,'web',root);addWorkspaceDependency('api:API-1','web:WEB-1',root);let st=workspaceStatus(root);assert.equal(st.repositories.find(x=>x.alias==='web').next,null);assert.equal(st.repositories.find(x=>x.alias==='web').crossBlocked[0].id,'WEB-1');const s=readState(api);s.tasks[0].state='ACCEPTED';s.tasks[0].integratedCommit='abc123';writeState(s,api);st=workspaceStatus(root);assert.equal(st.repositories.find(x=>x.alias==='web').next.id,'WEB-1');assert.equal(st.dependencyStatus[0].satisfied,true);assert.equal(st.dependencyStatus[0].integratedCommit,'abc123');});
test('remote executor fails closed without an explicit host',async()=>{await assert.rejects(()=>remoteExecuteWorktree({host:'',worktree:process.cwd(),command:'true'}),/remote host is required/);});
