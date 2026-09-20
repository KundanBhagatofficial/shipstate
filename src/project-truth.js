import fs from 'node:fs';
import path from 'node:path';
import { sha256,writeJsonAtomic,readJson,now } from './utils.js';
import { readProjectContract,readProjectDocuments,REQUIRED_DOCUMENTS,PROJECT_DOC_DIR } from './project-kit.js';
import { recordMetric,appendEvent } from './store.js';

export const PROJECT_TRUTH_VERSION=1;
export const PROJECT_TRUTH_FILE='project-truth.json';

const PREFIX={product:'PROD',features:'REQ',ux:'UX',frontend:'FE',architecture:'ARCH',data:'DATA',security:'SEC',development:'DEV',testing:'QUAL',deployment:'DEPLOY',acceptance:'ACC',decisions:'DEC'};
const CONSTRAINT_KEYS=new Set(['frontend','architecture','data','security','development','deployment']);

export function projectTruthPath(root=process.cwd()){return path.join(root,'.shipstate',PROJECT_TRUTH_FILE);}
function canonicalHash(root){return sha256(JSON.stringify({contract:readProjectContract(root),documents:readProjectDocuments(root,Number.MAX_SAFE_INTEGER)}));}
function slug(s='section'){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'section';}
function cleanStatement(s=''){return String(s).replace(/^[-*+]\s+/,'').replace(/^\d+[.)]\s+/,'').replace(/\s+/g,' ').trim();}
function splitSections(text=''){
 const lines=String(text).split(/\r?\n/),out=[];let current={heading:'Overview',line:1,lines:[]};
 const flush=()=>{if(current.lines.some(x=>x.trim()))out.push({...current,text:current.lines.join('\n').trim()});};
 for(let i=0;i<lines.length;i++){const m=lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);if(m){flush();current={heading:m[2].trim(),line:i+1,lines:[]};}else current.lines.push(lines[i]);}flush();return out;
}
function sectionStatements(section){
 const lines=section.text.split(/\r?\n/);const bullets=lines.filter(x=>/^\s*(?:[-*+]|\d+[.)])\s+/.test(x)).map(cleanStatement).filter(x=>x.length>=8);if(bullets.length)return bullets;
 return section.text.split(/\n\s*\n/).map(cleanStatement).filter(x=>x.length>=20&&x.length<=1800).slice(0,12);
}
function sourceRef(doc,section){return `${PROJECT_DOC_DIR}/${doc.file}#${slug(section.heading)}`;}
function entry(doc,section,statement,index){const source=sourceRef(doc,section),prefix=PREFIX[doc.key]||'FACT';return {id:`${prefix}-${sha256(`${source}\n${statement}\n${index}`).slice(0,10).toUpperCase()}`,statement,source,sourceLine:section.line,sourceKey:doc.key};}
function pushClassified(truth,doc,e){
 if(doc.key==='features')truth.requirements.push(e);
 else if(doc.key==='decisions')truth.decisions.push(e);
 else if(doc.key==='acceptance')truth.acceptance.push(e);
 else if(['ux','testing'].includes(doc.key))truth.quality.push(e);
 else if(CONSTRAINT_KEYS.has(doc.key))truth.constraints[doc.key].push(e);
 else truth.product.push(e);
}
export function compileProjectTruth(root=process.cwd(),{record=true}={}){
 const documents=readProjectDocuments(root,Number.MAX_SAFE_INTEGER),sourceHashes={};const truth={version:PROJECT_TRUTH_VERSION,compiledAt:now(),contractHash:canonicalHash(root),sourceHashes,product:[],requirements:[],decisions:[],constraints:{frontend:[],architecture:[],data:[],security:[],development:[],deployment:[]},quality:[],acceptance:[]};
 for(const doc of REQUIRED_DOCUMENTS){const text=documents[doc.key]||'';sourceHashes[doc.key]=sha256(text);for(const section of splitSections(text)){const statements=sectionStatements(section);for(let i=0;i<statements.length;i++)pushClassified(truth,doc,entry(doc,section,statements[i],i));}}
 const out=projectTruthPath(root);writeJsonAtomic(out,truth);if(record){const rawBytes=Object.values(documents).reduce((n,x)=>n+Buffer.byteLength(x||''),0),truthBytes=Buffer.byteLength(JSON.stringify(truth));recordMetric('projectTruth',{at:truth.compiledAt,contractHash:truth.contractHash,rawBytes,truthBytes,rawEstimatedTokens:Math.ceil(rawBytes/4),truthEstimatedTokens:Math.ceil(truthBytes/4),entries:truth.product.length+truth.requirements.length+truth.decisions.length+truth.quality.length+truth.acceptance.length+Object.values(truth.constraints).reduce((n,x)=>n+x.length,0)},root);appendEvent('PROJECT_TRUTH_COMPILED',{contractHash:truth.contractHash,path:path.relative(root,out),entries:truth.requirements.length+truth.decisions.length},root);}return truth;
}
export function readProjectTruth(root=process.cwd(),{refresh=true}={}){const existing=readJson(projectTruthPath(root));const hash=canonicalHash(root);if(existing?.version===PROJECT_TRUTH_VERSION&&existing.contractHash===hash)return existing;if(!refresh)return null;return compileProjectTruth(root);}
function scoreEntry(e,terms){const hay=`${e.id} ${e.statement} ${e.source}`.toLowerCase();return terms.reduce((n,t)=>n+(hay.includes(t)?1:0),0);}
export function selectProjectTruth(query,root=process.cwd(),{limit=40}={}){const truth=readProjectTruth(root),terms=[...new Set(String(query||'').toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g)||[])].filter(x=>!['the','and','for','with','from','this','that','task'].includes(x));const all=[...truth.product,...truth.requirements,...truth.decisions,...truth.quality,...truth.acceptance,...Object.values(truth.constraints).flat()];const ranked=all.map(e=>({e,score:scoreEntry(e,terms)})).sort((a,b)=>b.score-a.score||a.e.id.localeCompare(b.e.id));const selected=ranked.filter(x=>x.score>0).slice(0,limit).map(x=>x.e);return {contractHash:truth.contractHash,selected: selected.length?selected:all.slice(0,Math.min(12,limit)),sourceHashes:truth.sourceHashes};}
