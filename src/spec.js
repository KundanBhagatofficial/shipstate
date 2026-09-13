import fs from 'node:fs';
import path from 'node:path';
import { now } from './core.js';

function list(value='') { return value.split(',').map(x=>x.trim()).filter(Boolean); }
export function parseTaskMarkdown(text,file='task.md') {
  const lines=text.split(/\r?\n/); const title=(lines.find(l=>l.startsWith('# '))??'').slice(2).trim();
  const meta={}; let section=''; const body={objective:[],acceptance:[],verification:[],files:[]};
  for (const raw of lines) {
    const line=raw.trim();
    const m=line.match(/^([A-Za-z][A-Za-z ]+):\s*(.+)$/); if(m && !section) meta[m[1].toLowerCase().replaceAll(' ','')]=m[2].trim();
    if(line.startsWith('## ')) { section=line.slice(3).toLowerCase(); continue; }
    if(line.startsWith('- ')) {
      if(section.includes('acceptance')) body.acceptance.push(line.slice(2));
      else if(section.includes('verification')) body.verification.push(line.slice(2));
      else if(section.includes('files')) body.files.push(line.slice(2));
    } else if(line && section.includes('objective')) body.objective.push(line);
  }
  const taskId=meta.id || path.basename(file,path.extname(file)).toUpperCase();
  return { id:taskId,title:title||taskId,objective:body.objective.join(' '),acceptanceCriteria:body.acceptance,verification:body.verification,files:body.files,dependsOn:list(meta.dependson),priority:Number(meta.priority||0),state:'PENDING',createdAt:now(),updatedAt:now(),source:file };
}
export function loadTaskFiles(target) {
  const stat=fs.statSync(target); const files=stat.isDirectory()?fs.readdirSync(target).filter(f=>f.endsWith('.md')).sort().map(f=>path.join(target,f)):[target];
  return files.map(f=>parseTaskMarkdown(fs.readFileSync(f,'utf8'),f));
}
