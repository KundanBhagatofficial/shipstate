import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir,run } from '../utils.js';

const COPY_IGNORES=new Set(['.git','.shipstate','node_modules','vendor','dist','build','coverage','.next','Pods','DerivedData']);

function copyTree(source,target){
  fs.cpSync(source,target,{recursive:true,dereference:false,filter:(src)=>{
    const rel=path.relative(source,src);if(!rel)return true;const first=rel.split(path.sep)[0];return !COPY_IGNORES.has(first);
  }});
}
function copyControlFile(source,target){if(!fs.existsSync(source))return;ensureDir(path.dirname(target));fs.cpSync(source,target,{recursive:true,dereference:false});}
function sourceIsCleanGit(root){const inside=run('git',['rev-parse','--is-inside-work-tree'],{cwd:root,timeout:5000,maxBuffer:1024*1024});if(inside.status!==0)return false;const status=run('git',['status','--porcelain=v1','--untracked-files=normal'],{cwd:root,timeout:5000,maxBuffer:4*1024*1024});return status.status===0&&!(status.stdout||'').trim();}
function makeProjection(root,providerId){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-provider-')),projection=path.join(parent,'repo');let mode='copy';
  if(sourceIsCleanGit(root)){
    const cloned=run('git',['clone','--shared','--quiet',root,projection],{timeout:2*60*1000,maxBuffer:8*1024*1024});
    if(cloned.status===0)mode='git-clone';
  }
  if(!fs.existsSync(projection)){ensureDir(projection);copyTree(root,projection);}
  copyControlFile(path.join(root,'.shipstate','integrations'),path.join(projection,'.shipstate','integrations'));
  copyControlFile(path.join(root,'.shipstate','providers',providerId,'config.json'),path.join(projection,'.shipstate','providers',providerId,'config.json'));
  return {parent,projection,mode};
}
function cleanup(parent){try{fs.rmSync(parent,{recursive:true,force:true,maxRetries:2,retryDelay:50});}catch{}}
export async function withReadOnlyProviderRoot(root,providerId,fn){
  const source=path.resolve(root),cacheDir=path.join(source,'.shipstate','cache','providers',providerId);ensureDir(cacheDir);const p=makeProjection(source,providerId);
  try{return await fn(p.projection,{providerRoot:p.projection,controlRoot:source,dataDir:cacheDir,isolation:'disposable-projection',projectionMode:p.mode,readOnly:true});}
  finally{cleanup(p.parent);}
}
