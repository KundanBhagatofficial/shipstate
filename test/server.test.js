import test from 'node:test';
import assert from 'node:assert/strict';
import { createShipstateServer } from '../src/server.js';
import { cleanup, tempProject } from './helpers.js';

test('local dashboard API serves state and protects mutations with session token',async()=>{
  const root=tempProject('server');
  const {server,token}=createShipstateServer(root);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const {port}=server.address(); const base=`http://127.0.0.1:${port}`;
  try{
    const meta=await (await fetch(`${base}/api/meta`)).json(); assert.equal(meta.token,token);
    const status=await (await fetch(`${base}/api/status`)).json(); assert.equal(status.project.name,'Test Project');
    const denied=await fetch(`${base}/api/recover`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'}); assert.equal(denied.status,403);
    const allowed=await fetch(`${base}/api/recover`,{method:'POST',headers:{'content-type':'application/json','x-shipstate-token':token},body:'{}'}); assert.equal(allowed.status,200);
    const page=await fetch(base); assert.match(await page.text(),/SHIPSTATE/);
  } finally { await new Promise(resolve=>server.close(resolve)); cleanup(root); }
});
