import fs from 'node:fs';
import path from 'node:path';
import { run,now } from '../utils.js';
import { readProjectContract } from '../project-kit.js';

const BUILTINS=new Map(),MAX_RESULT_BYTES=2*1024*1024;
function configSafe(root){try{return readProjectContract(root).providers||{};}catch{return {};}}
function safeResult(value,id){let text;try{text=JSON.stringify(value);}catch{throw new Error(`${id} provider returned a non-serializable result`);}if(Buffer.byteLength(text)>MAX_RESULT_BYTES)throw new Error(`${id} provider result exceeds ${MAX_RESULT_BYTES} bytes`);return value;}
export function registerProvider(provider){if(!provider?.id||!/^[a-z0-9][a-z0-9-]*$/i.test(provider.id))throw new Error('Provider id is required and must be identifier-safe');if(!Array.isArray(provider.capabilities)||!provider.capabilities.length)throw new Error(`Provider ${provider.id} must declare capabilities`);for(const fn of ['detect','query'])if(typeof provider[fn]!=='function')throw new Error(`Provider ${provider.id} must implement ${fn}()`);if(provider.readOnly===false)throw new Error(`Provider ${provider.id} must be read-only; state mutation belongs to SHIPSTATE`);BUILTINS.set(provider.id,Object.freeze({...provider,readOnly:true}));return provider;}
export function providerRegistry(){return new Map(BUILTINS);}
export function providersFor(capability){return [...BUILTINS.values()].filter(p=>p.capabilities.includes(capability));}
export function providerConfig(root=process.cwd()){return configSafe(root);}
function configuredId(capability,root){const p=configSafe(root),keys={structuralContext:'structural-context',semanticContext:'semantic-context',uiIntelligence:'ui-intelligence',discoverability:'discoverability'};for(const [key,cap] of Object.entries(keys))if(cap===capability)return p[key]||'auto';return 'auto';}
function detected(p,root,ctx){try{return p.detect(root,ctx);}catch(e){return {available:false,reason:e.message};}}
function rankedProviders(capability,root,ctx){const wanted=configuredId(capability,root),all=providersFor(capability);if(wanted==='off')return [];const rank=p=>Number(typeof p.score==='function'?p.score(root,ctx,detected(p,root,ctx)):p.priority||0);let ordered=all.filter(p=>detected(p,root,ctx)?.available!==false).sort((a,b)=>rank(b)-rank(a));if(wanted&&wanted!=='auto'){const exact=all.find(p=>p.id===wanted);if(!exact)throw new Error(`Configured provider ${wanted} does not support ${capability}`);ordered=[exact,...ordered.filter(p=>p.id!==wanted)];}return ordered;}
export function providerHealth(root=process.cwd()){return [...BUILTINS.values()].map(p=>({id:p.id,capabilities:p.capabilities,network:Boolean(p.network),readOnly:true,detected:detected(p,root,{})}));}
export function chooseProvider(capability,root=process.cwd(),ctx={}){return rankedProviders(capability,root,ctx)[0]||null;}
export async function queryProvider(capability,input,root=process.cwd(),ctx={}){const started=Date.now(),candidates=rankedProviders(capability,root,ctx),attempts=[];for(const provider of candidates){const t=Date.now();try{if(typeof provider.prepare==='function'&&ctx.prepare!==false)await provider.prepare(root,ctx);const result=safeResult(await provider.query(input,root,ctx),provider.id);return {provider:provider.id,available:true,result,latencyMs:Date.now()-started,providerLatencyMs:Date.now()-t,attempts,at:now(),fallbackFrom:attempts.length?attempts.map(x=>x.provider):[]};}catch(e){attempts.push({provider:provider.id,error:String(e.message||e).slice(0,1000),latencyMs:Date.now()-t});}}return {provider:candidates[0]?.id||null,available:false,error:attempts.at(-1)?.error||'no provider available',result:null,latencyMs:Date.now()-started,attempts,at:now()};}
export function executableOnPath(name){return run(process.platform==='win32'?'where':'which',[name]).status===0;}
export function providerDataDir(root=process.cwd(),id='provider'){const p=path.join(root,'.shipstate','providers',id);fs.mkdirSync(p,{recursive:true});return p;}
