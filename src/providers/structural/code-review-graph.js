import fs from 'node:fs';
import path from 'node:path';
import { run,sha256 } from '../../utils.js';
import { executableOnPath } from '../registry.js';

function gitHead(root){const r=run('git',['rev-parse','HEAD'],{cwd:root});return r.status===0?(r.stdout||'').trim():'unversioned';}
function dataDir(root,ctx={}){if(ctx.dataDir)return ctx.dataDir;const repoKey=sha256(path.resolve(root)).slice(0,12),head=gitHead(root).slice(0,16);return path.join(root,'.shipstate','cache','structural','crg',repoKey,head);}
function exec(root,args,ctx={}){const dir=dataDir(root,ctx);fs.mkdirSync(dir,{recursive:true});const r=run('code-review-graph',args,{cwd:root,env:{...process.env,CRG_DATA_DIR:dir},maxBuffer:12*1024*1024});if(r.status!==0)throw new Error((r.stderr||r.stdout||`code-review-graph ${args[0]} failed`).trim());return {stdout:r.stdout||'',stderr:r.stderr||'',dataDir:dir};}
function json(root,args,ctx={}){const r=exec(root,args,ctx);try{return {...JSON.parse(r.stdout||'null'),_shipstate:{dataDir:r.dataDir}};}catch{throw new Error(`code-review-graph returned non-JSON output for ${args[0]}`);}}
function status(root,ctx={}){try{return json(root,['status','--json'],ctx);}catch(e){return {available:false,error:e.message};}}
function ensureGraph(root,ctx={}){let s=status(root,ctx);if(s.nodes>0&&!s.build_incomplete)return s;const args=['build','--quiet'];if(ctx.postprocess==='minimal')args.push('--skip-flows');exec(root,args,ctx);s=status(root,ctx);if(!s.nodes)throw new Error('code-review-graph build produced no graph nodes');return s;}
function repositorySize(root){const r=run('git',['ls-files'],{cwd:root});return r.status===0?(r.stdout||'').split(/\r?\n/).filter(Boolean).length:0;}

export const codeReviewGraphProvider={
 id:'code-review-graph',
 capabilities:['structural-context','impact-analysis','architecture-context'],
 network:false,
 readOnly:true,
 priority:50,
 detect(root){if(!executableOnPath('code-review-graph'))return {available:false,reason:'code-review-graph executable not found'};const v=run('code-review-graph',['--version'],{cwd:root});return {available:v.status===0,version:(v.stdout||v.stderr||'').trim().split(/\r?\n/)[0]||null};},
 score(root,ctx={}){const files=Number(ctx.repositoryFiles||repositorySize(root)),langs=(ctx.languages||[]).map(x=>String(x).toLowerCase()),platforms=(ctx.platforms||[]).map(x=>String(x).toLowerCase());let score=files>=300?120:files>=150?65:15;if(langs.some(x=>['swift','dart','kotlin'].includes(x))||platforms.some(x=>['ios','android','mobile'].includes(x)))score+=50;if(ctx.highImpact)score+=30;if(ctx.trivial)score-=100;return score;},
 prepare(root,ctx={}){return ensureGraph(root,ctx);},
 query(input={},root,ctx={}){ensureGraph(root,{...ctx,postprocess:input.includeFlows?'full':'minimal'});switch(input.action||'search'){
   case'status':return status(root,ctx);
   case'search':return json(root,['search',String(input.query||''),'--limit',String(Math.min(50,Number(input.limit||12)))],ctx);
   case'query':return json(root,['query',String(input.pattern||'file_summary'),String(input.target||'')],ctx);
   case'impact':{const args=['impact','--depth',String(Math.min(4,Number(input.depth||2))),'--max-results',String(Math.min(500,Number(input.maxResults||120)))];if(input.base)args.push('--base',String(input.base));if(input.files?.length)args.push('--files',...input.files.map(String));return json(root,args,ctx);}
   case'architecture':return json(root,['architecture','--detail-level',input.detailLevel==='standard'?'standard':'minimal'],ctx);
   case'flows':return json(root,['flows','--limit',String(Math.min(50,Number(input.limit||20)))],ctx);
   case'detect-changes':{const args=['detect-changes'];if(input.base)args.push('--base',String(input.base));return json(root,args,ctx);}
   default:throw new Error(`Unsupported code-review-graph action: ${input.action}`);
 }}
};
