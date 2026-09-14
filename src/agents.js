import { run } from './utils.js';

export const ADAPTERS={
  manual:{kind:'manual'},
  'dry-run':{kind:'command',command:()=>({cmd:process.execPath,args:['-e','console.log("SHIPSTATE dry-run")']})},
  claude:{
    kind:'command',
    macKeychain:true,
    command:ctx=>({cmd:'claude',args:['-p',`Implement the task using the SHIPSTATE context at ${ctx}. Stay within allowed paths. Do not modify .shipstate or .git.`]})
  },
  codex:{kind:'command',command:ctx=>({cmd:'codex',args:['exec',`Implement the task using the SHIPSTATE context at ${ctx}. Stay within allowed paths. Do not modify .shipstate or .git.`]})}
};

export function adapter(name){const a=ADAPTERS[name];if(!a)throw new Error(`Unsupported agent: ${name}`);return a;}
export function executableInfo(name){if(name==='manual'||name==='dry-run')return {available:true,version:'builtin'};const cmd=name==='claude'?'claude':'codex';const r=run(cmd,['--version']);return {available:r.status===0,version:r.status===0?(r.stdout||r.stderr||'').trim():'not found'};}
export function commandFor(name,ctx){const a=adapter(name);return a.kind==='manual'?null:a.command(ctx);}
export function requiresMacKeychain(name){return Boolean(ADAPTERS[name]?.macKeychain);}

export function parseClaudeAuthStatus(output,status=0){
  const text=String(output||'').trim();
  let parsed=null;
  try{parsed=JSON.parse(text);}catch{
    const start=text.indexOf('{');const end=text.lastIndexOf('}');
    if(start>=0&&end>start){try{parsed=JSON.parse(text.slice(start,end+1));}catch{}}
  }
  if(parsed&&typeof parsed.loggedIn==='boolean')return {supported:true,loggedIn:parsed.loggedIn,authMethod:parsed.authMethod||null,status};
  if(/not logged in|please run \/login/i.test(text))return {supported:true,loggedIn:false,authMethod:null,status};
  return {supported:false,loggedIn:null,authMethod:null,status};
}

export function authStatus(name){
  if(name!=='claude')return {supported:false,loggedIn:null,authMethod:null,status:null};
  const r=run('claude',['auth','status']);
  return parseClaudeAuthStatus(`${r.stdout||''}\n${r.stderr||''}`,r.status);
}
