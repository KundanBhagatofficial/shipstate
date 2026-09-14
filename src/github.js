import { run } from './utils.js';
export function githubAvailable(){const r=run('gh',['--version']);return {available:r.status===0,version:r.status===0?(r.stdout||'').split('\n')[0]:'not found'};}
function gh(args,root){const r=run('gh',args,{cwd:root});if(r.status!==0)throw new Error((r.stderr||r.stdout||'gh failed').trim());return (r.stdout||'').trim();}
export function githubStatus(root=process.cwd()){if(!githubAvailable().available)return {available:false};try{return {available:true,auth:gh(['auth','status'],root),repo:gh(['repo','view','--json','nameWithOwner,url,defaultBranchRef'],root)};}catch(e){return {available:true,error:e.message};}}
export function createPullRequest({title,body='',base,head,draft=false},root=process.cwd()){const args=['pr','create','--title',title,'--body',body];if(base)args.push('--base',base);if(head)args.push('--head',head);if(draft)args.push('--draft');return {url:gh(args,root)};}
export function prChecks(pr,root=process.cwd()){return gh(['pr','checks',String(pr),'--json','name,state,bucket,link'],root);}
export function prView(pr,root=process.cwd()){return JSON.parse(gh(['pr','view',String(pr),'--json','number,title,state,mergeable,reviewDecision,statusCheckRollup,url,headRefName,baseRefName'],root));}
