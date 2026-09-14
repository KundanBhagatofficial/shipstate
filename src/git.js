import fs from 'node:fs';import path from 'node:path';import { run,rel,sha256 } from './utils.js';import { paths } from './store.js';
function git(root,args,{ok=[0]}={}){const r=run('git',args,{cwd:root});if(!ok.includes(r.status??1))throw new Error(`git ${args.join(' ')} failed: ${(r.stderr||r.stdout||'').trim()}`);return (r.stdout||'').trim();}
export const isGitRepo=root=>run('git',['rev-parse','--is-inside-work-tree'],{cwd:root}).status===0;
export const head=root=>git(root,['rev-parse','HEAD']);
export const branch=root=>git(root,['rev-parse','--abbrev-ref','HEAD']);
export const isClean=root=>git(root,['status','--porcelain'])==='';
export const statusPorcelain=root=>git(root,['status','--porcelain']);
export function changedFiles(root){const a=git(root,['diff','--name-only']);const b=git(root,['diff','--cached','--name-only']);const c=git(root,['ls-files','--others','--exclude-standard']);return [...new Set([...a.split('\n'),...b.split('\n'),...c.split('\n')].filter(Boolean))];}
export function diffText(root){return git(root,['diff','--no-ext-diff','--binary','HEAD'],{ok:[0]});}
export function worktreeFor(taskId,runId,base,root=process.cwd()){const p=path.join(paths(root).worktrees,`${taskId}-${runId}`);fs.mkdirSync(path.dirname(p),{recursive:true});git(root,['worktree','add','--detach',p,base]);return p;}
export function removeWorktree(p,root=process.cwd()){if(!p)return;run('git',['worktree','remove','--force',p],{cwd:root});if(fs.existsSync(p))fs.rmSync(p,{recursive:true,force:true});run('git',['worktree','prune'],{cwd:root});}
export function createCandidateCommit(worktree,message){git(worktree,['add','-A']);const files=git(worktree,['diff','--cached','--name-only']);if(!files)return null;git(worktree,['-c','user.name=SHIPSTATE','-c','user.email=shipstate@local','commit','-m',message]);return head(worktree);}
export function acceptCandidate(candidate,base,root=process.cwd()){if(!isClean(root))throw new Error('Main working tree must be clean before acceptance');if(head(root)!==base)throw new Error('Repository HEAD moved since task execution; refusing stale candidate');git(root,['cherry-pick',candidate]);return head(root);}
export function abortCherryPick(root=process.cwd()){run('git',['cherry-pick','--abort'],{cwd:root});}
export function gitHistory(root,files=[],limit=8){const args=['log',`-${limit}`,'--pretty=format:%h %ad %s','--date=short'];if(files.length)args.push('--',...files);const r=run('git',args,{cwd:root});return r.status===0?(r.stdout||'').trim().split('\n').filter(Boolean):[];}
export function remoteInfo(root=process.cwd()){const r=run('git',['remote','-v'],{cwd:root});return r.status===0?(r.stdout||'').trim().split('\n').filter(Boolean):[];}
export function diffEvidence(worktree){git(worktree,['add','-A']);const text=git(worktree,['diff','--cached','--no-ext-diff','--binary','HEAD'],{ok:[0]});return {hash:sha256(text),bytes:Buffer.byteLength(text),summary:git(worktree,['diff','--cached','--stat','HEAD'],{ok:[0]})};}
