import fs from 'node:fs';
import path from 'node:path';
import { run,now } from '../utils.js';
import { readProjectContract } from '../project-kit.js';

const BUILTINS=new Map();

export function registerProvider(provider){if(!provider?.id)throw new Error('Provider id is required');if(!Array.isArray(provider.capabilities)||!provider.capabilities.length)throw new Error(`Provider ${provider.id} must declare capabilities`);for(const fn of ['detect','query'])if(typeof provider[fn]!=='function')throw new Error(`Provider ${provider.id} must implement ${fn}()`);BUILTINS.set(provider.id,Object.freeze({...provider}));return provider;}
export function providerRegistry(){return new Map(BUILTINS);}
export function providersFor(capability){return [...BUILTINS.values()].filter(p=>p.capabilities.includes(capability));}
export function providerConfig(root=process.cwd()){const contract=readProjectContract(root);return contract.providers||{};}
function configuredId(capability,root){const p=providerConfig(root);const keys={structuralContext:'structural-context',semanticContext:'semantic-context',uiIntelligence:'ui-intelligence',discoverability:'discoverability'};for(const [key,cap] of Object.entries(keys))if(cap===capability)return p[key]||'auto';return 'auto';}
export function providerHealth(root=process.cwd()){
 const out=[];for(const p of BUILTINS.values()){let detected;try{detected=p.detect(root);}catch(e){detected={available:false,reason:e.message};}out.push({id:p.id,capabilities:p.capabilities,network:Boolean(p.network),readOnly:p.readOnly!==false,detected});}return out;
}
export function chooseProvider(capability,root=process.cwd(),ctx={}){
 const wanted=configuredId(capability,root),candidates=providersFor(capability);if(wanted&&wanted!=='auto'&&wanted!=='off'){const exact=candidates.find(p=>p.id===wanted);if(!exact)throw new Error(`Configured provider ${wanted} does not support ${capability}`);const d=exact.detect(root,ctx);return d?.available===false?null:exact;}if(wanted==='off')return null;
 const ranked=candidates.map(p=>{let d;try{d=p.detect(root,ctx);}catch(e){d={available:false,reason:e.message};}return {p,d,score:Number(typeof p.score==='function'?p.score(root,ctx,d):p.priority||0)};}).filter(x=>x.d?.available!==false).sort((a,b)=>b.score-a.score);return ranked[0]?.p||null;
}
export async function queryProvider(capability,input,root=process.cwd(),ctx={}){const started=Date.now(),provider=chooseProvider(capability,root,ctx);if(!provider)return {provider:null,available:false,result:null,latencyMs:Date.now()-started,at:now()};try{if(typeof provider.prepare==='function'&&ctx.prepare!==false)await provider.prepare(root,ctx);const result=await provider.query(input,root,ctx);return {provider:provider.id,available:true,result,latencyMs:Date.now()-started,at:now()};}catch(e){return {provider:provider.id,available:false,error:e.message,result:null,latencyMs:Date.now()-started,at:now()};}}

export function executableOnPath(name){return run(process.platform==='win32'?'where':'which',[name]).status===0;}
export function providerDataDir(root=process.cwd(),id='provider'){const p=path.join(root,'.shipstate','providers',id);fs.mkdirSync(p,{recursive:true});return p;}
