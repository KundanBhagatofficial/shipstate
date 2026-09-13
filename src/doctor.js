import { spawnSync } from 'node:child_process';
function probe(name,cmd,args=['--version']) { const r=spawnSync(cmd,args,{encoding:'utf8'}); return {name,available:r.status===0,version:(r.stdout||r.stderr||'').trim().split('\n')[0]}; }
export function doctor() { return [probe('node',process.execPath,['--version']),probe('git','git',['--version']),probe('claude','claude'),probe('codex','codex')]; }
