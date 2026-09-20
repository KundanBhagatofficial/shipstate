import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { providerDataDir } from './registry.js';

export function commandProviderConfig(id,root=process.cwd()){
 const file=path.join(providerDataDir(root,id),'config.json');try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}
}
export function writeCommandProviderConfig(id,config,root=process.cwd()){const file=path.join(providerDataDir(root,id),'config.json');fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');return file;}
export function invokeCommandProvider(id,event,payload,root=process.cwd(),{optional=false,config=null}={}){
 const cfg=config||commandProviderConfig(id,root);if(!cfg?.command){if(optional)return null;throw new Error(`${id} provider is not configured with a command`);}const shell=process.platform==='win32'?'cmd':'sh',args=process.platform==='win32'?['/d','/s','/c',cfg.command]:['-lc',cfg.command];const r=spawnSync(shell,args,{cwd:root,encoding:'utf8',input:JSON.stringify({event,payload}),env:{...process.env,SHIPSTATE_PROVIDER:id,SHIPSTATE_PROVIDER_EVENT:event}});if(r.status!==0){if(optional)return {error:(r.stderr||r.stdout||'provider command failed').trim()};throw new Error((r.stderr||r.stdout||'provider command failed').trim());}try{return JSON.parse(r.stdout||'null');}catch{if(optional)return {error:`${id} returned invalid JSON`};throw new Error(`${id} returned invalid JSON`);}
}
