import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const roots=['src','web','scripts','test'];
const files=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile()&&p.endsWith('.js'))files.push(p)}}
for(const root of roots)walk(root);
let failed=false;
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){failed=true;console.error(`✗ ${file}\n${r.stderr}`)}else console.log(`✓ ${file}`)}
if(failed)process.exit(1);
console.log(`\nSyntax check passed: ${files.length} JavaScript files`);
