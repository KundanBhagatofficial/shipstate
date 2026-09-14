import { run } from './utils.js';
export const ADAPTERS={
 manual:{kind:'manual'},
 'dry-run':{kind:'command',command:()=>({cmd:process.execPath,args:['-e','console.log("SHIPSTATE dry-run")']})},
 claude:{kind:'command',command:ctx=>({cmd:'claude',args:['-p',`Implement the task using the SHIPSTATE context at ${ctx}. Stay within allowed paths. Do not modify .shipstate or .git.`]})},
 codex:{kind:'command',command:ctx=>({cmd:'codex',args:['exec',`Implement the task using the SHIPSTATE context at ${ctx}. Stay within allowed paths. Do not modify .shipstate or .git.`]})}
};
export function adapter(name){const a=ADAPTERS[name];if(!a)throw new Error(`Unsupported agent: ${name}`);return a;}
export function executableInfo(name){if(name==='manual'||name==='dry-run')return {available:true,version:'builtin'};const cmd=name==='claude'?'claude':'codex';const r=run(cmd,['--version']);return {available:r.status===0,version:r.status===0?(r.stdout||r.stderr||'').trim():'not found'};}
export function commandFor(name,ctx){const a=adapter(name);return a.kind==='manual'?null:a.command(ctx);}
