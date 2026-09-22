import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir,run } from '../utils.js';

const COPY_IGNORES=new Set(['.git','.shipstate','node_modules','vendor','dist','build','coverage','.next','Pods','DerivedData']);
const MAX_CACHE_FILES=20000,MAX_CACHE_BYTES=256*1024*1024;
function inside(base,target){const rel=path.relative(path.resolve(base),path.resolve(target));return rel===''||(!rel.startsWith('..')&&!path.isAbsolute(rel));}
function cleanup(parent){try{fs.rmSync(parent,{recursive:true,force:true,maxRetries:2,retryDelay:50});}catch{}}
function copyTree(source,target){fs.cpSync(source,target,{recursive:true,dereference:false,filter:(src)=>{const rel=path.relative(source,src);if(!rel)return true;return !COPY_IGNORES.has(rel.split(path.sep)[0]);}});}
function safeCopyControl(source,target,label='provider control data'){if(!fs.existsSync(source))return;const st=fs.lstatSync(source);if(st.isSymbolicLink())throw new Error(`${label} contains a symbolic link`);if(st.isFile()){ensureDir(path.dirname(target));fs.copyFileSync(source,target);return;}if(!st.isDirectory())throw new Error(`${label} contains an unsupported filesystem entry`);ensureDir(target);for(const name of fs.readdirSync(source))safeCopyControl(path.join(source,name),path.join(target,name),label);}
function assertProjectionSymlinksSafe(root){const walk=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(ent.name==='.git')continue;const abs=path.join(dir,ent.name);if(ent.isSymbolicLink()){const target=path.resolve(path.dirname(abs),fs.readlinkSync(abs));if(!inside(root,target))throw new Error(`Provider projection contains symlink escaping repository: ${path.relative(root,abs)}`);}else if(ent.isDirectory())walk(abs);}};walk(root);}
function sourceIsCleanGit(root){const insideGit=run('git',['rev-parse','--is-inside-work-tree'],{cwd:root,timeout:5000,maxBuffer:1024*1024});if(insideGit.status!==0)return false;const status=run('git',['status','--porcelain=v1','--untracked-files=normal'],{cwd:root,timeout:5000,maxBuffer:4*1024*1024});return status.status===0&&!(status.stdout||'').trim();}
function makeProjection(root,providerId){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'shipstate-provider-')),projection=path.join(parent,'repo');let mode='copy';
  try{
    if(sourceIsCleanGit(root)){const cloned=run('git',['clone','--no-hardlinks','--quiet',root,projection],{timeout:2*60*1000,maxBuffer:8*1024*1024});if(cloned.status===0){run('git',['remote','remove','origin'],{cwd:projection,timeout:5000,maxBuffer:1024*1024});mode='git-clone';}}
    if(!fs.existsSync(projection)){ensureDir(projection);copyTree(root,projection);}assertProjectionSymlinksSafe(projection);
    safeCopyControl(path.join(root,'.shipstate','integrations'),path.join(projection,'.shipstate','integrations'),'integration configuration');
    safeCopyControl(path.join(root,'.shipstate','providers',providerId,'config.json'),path.join(projection,'.shipstate','providers',providerId,'config.json'),'provider configuration');
    const sourceCache=path.join(root,'.shipstate','cache','providers',providerId),projectionCache=path.join(projection,'.shipstate','cache','providers',providerId);if(fs.existsSync(sourceCache))safeCopyControl(sourceCache,projectionCache,'provider cache');else ensureDir(projectionCache);
    return {parent,projection,mode,sourceCache,projectionCache};
  }catch(e){cleanup(parent);throw e;}
}
function cacheInventory(root){let files=0,bytes=0;const walk=dir=>{if(!fs.existsSync(dir))return;for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,ent.name);if(ent.isSymbolicLink())throw new Error('Provider cache contains a symbolic link');if(ent.isDirectory())walk(abs);else if(ent.isFile()){files++;bytes+=fs.statSync(abs).size;if(files>MAX_CACHE_FILES||bytes>MAX_CACHE_BYTES)throw new Error('Provider cache exceeds SHIPSTATE persistence limits');}else throw new Error('Provider cache contains an unsupported filesystem entry');}};walk(root);return {files,bytes};}
function persistCache(sourceCache,projectionCache){if(!fs.existsSync(projectionCache))return {files:0,bytes:0};const inventory=cacheInventory(projectionCache);fs.rmSync(sourceCache,{recursive:true,force:true});ensureDir(path.dirname(sourceCache));fs.cpSync(projectionCache,sourceCache,{recursive:true,dereference:false});return inventory;}
export async function withReadOnlyProviderRoot(root,providerId,fn){const source=path.resolve(root),p=makeProjection(source,providerId);let result,error;try{result=await fn(p.projection,{providerRoot:p.projection,dataDir:p.projectionCache,isolation:'disposable-projection',projectionMode:p.mode,readOnly:true});}catch(e){error=e;}try{persistCache(p.sourceCache,p.projectionCache);}finally{cleanup(p.parent);}if(error)throw error;return result;}
