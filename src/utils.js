import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const now = () => new Date().toISOString();
export const id = (prefix='id') => `${prefix}-${randomUUID().slice(0,8)}`;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const ensureDir = (p) => fs.mkdirSync(p,{recursive:true});
export const readJson = (p, fallback=null) => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; } };
export const writeJsonAtomic = (p, value) => { ensureDir(path.dirname(p)); const tmp=`${p}.${process.pid}.${Date.now()}.tmp`; fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n'); fs.renameSync(tmp,p); };
export const run = (cmd,args=[],opts={}) => spawnSync(cmd,args,{encoding:'utf8',shell:false,...opts});
export const runShell = (command,cwd,env=process.env,timeout=0) => spawnSync(command,{cwd,env,encoding:'utf8',shell:true,timeout:timeout||undefined});
export const rel = (root,p) => path.relative(root,p).split(path.sep).join('/');
export const normalizePath = (p='') => p.replaceAll('\\','/').replace(/^\.\//,'');
export const globToRegExp = (glob) => {
  const g=normalizePath(glob).replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*\*/g,'§§').replace(/\*/g,'[^/]*').replace(/§§/g,'.*').replace(/\?/g,'.');
  return new RegExp(`^${g}$`);
};
export const matchGlob = (file,glob) => globToRegExp(glob).test(normalizePath(file));
export const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
export const unique = (xs) => [...new Set(xs)];
export const estimateTokens = (text='') => Math.max(1,Math.ceil(Buffer.byteLength(text,'utf8')/4));
export function walk(root,{ignore=[]}={}) {
  const out=[]; const rec=(dir)=>{ for(const ent of fs.readdirSync(dir,{withFileTypes:true})) { const abs=path.join(dir,ent.name); const rp=rel(root,abs); if(ignore.some(g=>matchGlob(rp,g)||rp.startsWith(g.replace('/**','')))) continue; if(ent.isDirectory()) rec(abs); else out.push(rp); }}; rec(root); return out;
}
