import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { projectStatus } from './status.js';
import { runTask,cancelRun } from './runner.js';
import { verifyTask } from './verifier.js';
import { acceptTask,rejectTask,unblockTask } from './actions.js';
import { recover } from './recovery.js';
import { refreshProfile,readState,verifyJournal,backupState } from './store.js';
import { compileContext } from './context.js';
import { compileRoutedContext } from './context-router.js';
import { compileProjectTruth } from './project-truth.js';
import { adviseUi,certifyQuality } from './quality.js';
import { autopilot } from './scheduler.js';
import { listProjects } from './projects.js';
import { activeRuns } from './runtime.js';
import { githubStatus } from './github.js';
import { initializeHandover,handoverAudit,handoverStatus,decideProject,acceptHandover,resolveOwnerDecision } from './handover.js';
import { startDeliveryBackground,pauseDelivery,activeDeliveries } from './delivery.js';

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const body=req=>new Promise((resolve,reject)=>{let d='',settled=false;req.on('data',c=>{if(settled)return;d+=c;if(Buffer.byteLength(d,'utf8')>2_000_000){settled=true;reject(new Error('request too large'));}});req.on('end',()=>{if(settled)return;try{resolve(d?JSON.parse(d):{});}catch(e){reject(e);}});});
const send=(res,code,data,type='application/json')=>{res.writeHead(code,{'content-type':type,'cache-control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(data,null,2):data);};
async function contextFor(taskId,root,budgetTokens){return fs.existsSync(path.join(root,'shipstate.project.json'))?compileRoutedContext(taskId,root,{budgetTokens}):compileContext(taskId,root,{budgetTokens});}
export function resolveStaticFile(webRoot,pathname){let decoded;try{decoded=decodeURIComponent(pathname);}catch{return null;}const route=decoded==='/'?'/index.html':decoded,relativeRoute=route.replace(/^\/+/,''),file=path.resolve(webRoot,relativeRoute),relative=path.relative(webRoot,file);if(relative.startsWith('..')||path.isAbsolute(relative))return null;return file;}

export function createServer({root=process.cwd(),host='127.0.0.1',port=4317}={}){
 const token=randomBytes(24).toString('hex'),webRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
 const server=http.createServer(async(req,res)=>{try{
   const u=new URL(req.url,`http://${req.headers.host||host}`);
   if(u.pathname.startsWith('/api/')){
     if(req.method!=='GET'&&req.headers['x-shipstate-token']!==token)return send(res,403,{error:'invalid mutation token'});
     if(req.method==='GET'&&u.pathname==='/api/state')return send(res,200,{...projectStatus(root),activeRuns:activeRuns(),activeDeliveries:activeDeliveries(),journal:verifyJournal(root),projects:listProjects(),github:githubStatus(root)});
     if(req.method==='GET'&&u.pathname==='/api/handover')return send(res,200,handoverStatus(root));
     if(req.method==='GET'&&u.pathname==='/api/log'){const runId=u.searchParams.get('runId'),r=readState(root).runs.find(x=>x.id===runId);return send(res,200,{runId,log:r?.logPath&&fs.existsSync(r.logPath)?fs.readFileSync(r.logPath,'utf8'):''});}
     if(req.method==='POST'&&u.pathname==='/api/action'){
       const b=await body(req);let out;
       switch(b.action){
         case'run':out=await runTask(b.taskId,b.agent||'manual',root,b.options||{});break;
         case'verify':out=verifyTask(b.taskId,root);break;
         case'accept':out=acceptTask(b.taskId,root,'dashboard');break;
         case'reject':out=rejectTask(b.taskId,b.reason||'dashboard rejection',root,'dashboard');break;
         case'unblock':out=unblockTask(b.taskId,root);break;
         case'cancel':out={cancelled:cancelRun(b.runId,root)};break;
         case'recover':out=recover(root);break;
         case'profile':out=refreshProfile(root);break;
         case'context':out=await contextFor(b.taskId,root,b.budgetTokens);break;
         case'truth-compile':out=compileProjectTruth(root);break;
         case'ui-advisory':out=await adviseUi(root);break;
         case'quality-certify':out=await certifyQuality(root);break;
         case'autopilot':out=await autopilot(b.options||{},root);break;
         case'backup':out={path:backupState(root)};break;
         case'handover-init':out=initializeHandover(root);break;
         case'handover-audit':out=handoverAudit(root);break;
         case'handover-accept':out=acceptHandover(root);break;
         case'handover-decision':out=decideProject(b.key,b.status,b.note||'',root);break;
         case'delivery-start':out=startDeliveryBackground(b.options||{},root);break;
         case'delivery-pause':out=pauseDelivery(root,b.reason||'paused by owner');break;
         case'decision-resolve':out=resolveOwnerDecision(b.decisionId,b.resolution,b.note||'',root);break;
         default:throw new Error(`Unknown action: ${b.action}`);
       }
       return send(res,200,{ok:true,result:out});
     }
     return send(res,404,{error:'not found'});
   }
   const file=resolveStaticFile(webRoot,u.pathname);if(!file||!fs.existsSync(file)||fs.statSync(file).isDirectory())return send(res,404,'Not found','text/plain');return send(res,200,fs.readFileSync(file),MIME[path.extname(file)]||'application/octet-stream');
 }catch(e){send(res,500,{error:e.message,stack:process.env.SHIPSTATE_DEBUG?e.stack:undefined});}});
 return {token,server,listen:()=>new Promise(resolve=>server.listen(port,host,()=>{const actual=server.address().port;resolve({host,port:actual,token,url:`http://${host}:${actual}`});}))};
}
