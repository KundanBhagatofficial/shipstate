import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import { readJson,writeJsonAtomic,now } from './utils.js';
const registryPath=()=>path.join(os.homedir(),'.shipstate','projects.json');
export function listProjects(){return readJson(registryPath(),{projects:[]}).projects||[];}
export function registerProject(root,name){const p=registryPath();const data=readJson(p,{projects:[]});const abs=path.resolve(root);const existing=data.projects.find(x=>x.root===abs);if(existing){existing.lastOpenedAt=now();existing.name=name||existing.name;}else data.projects.push({root:abs,name:name||path.basename(abs),registeredAt:now(),lastOpenedAt:now()});writeJsonAtomic(p,data);return data.projects;}
export function unregisterProject(root){const p=registryPath();const data=readJson(p,{projects:[]});data.projects=data.projects.filter(x=>x.root!==path.resolve(root));writeJsonAtomic(p,data);return data.projects;}
