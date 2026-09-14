import os from 'node:os';import { run } from './utils.js';
export function detectSandbox(){
 if(process.platform==='linux'){const b=run('bwrap',['--version']);if(b.status===0)return {kind:'bubblewrap',level:'os',available:true,version:(b.stdout||'').trim()};}
 if(process.platform==='darwin'){const s=run('sandbox-exec',['-h']);if(s.status===0||s.status===64)return {kind:'sandbox-exec',level:'os',available:true,version:'system'};}
 if(process.platform==='win32')return {kind:'windows-process',level:'worktree',available:true,warning:'OS filesystem sandbox not enabled; worktree/path policy only'};
 return {kind:'worktree',level:'worktree',available:true,warning:'No supported OS-native sandbox detected'};
}
function seatbeltPath(value){return String(value||'').replaceAll('\\','/').replaceAll('"','\\"');}
function macChild(home,...parts){return [String(home||'').replaceAll('\\','/').replace(/\/+$/,''),...parts].join('/');}
export function macProfile(worktree,network,{keychainAccess=false,home=os.homedir(),tmpdir=process.env.TMPDIR||os.tmpdir()}={}){
 const keychain=keychainAccess?`\n; Claude Code subscription OAuth is stored in the macOS login Keychain.\n; This grant is agent-specific and is never enabled for ordinary commands.\n(allow mach-lookup\n  (global-name \"com.apple.SecurityServer\")\n  (global-name \"com.apple.securityd\")\n  (global-name \"com.apple.trustd\")\n  (global-name \"com.apple.ocspd\")\n  (global-name \"com.apple.cfprefsd.daemon\")\n  (global-name \"com.apple.xpcd\"))\n(allow file-read* file-write*\n  (subpath \"${seatbeltPath(macChild(home,'Library','Keychains'))}\")\n  (subpath \"${seatbeltPath(tmpdir)}\"))\n`:'';
 return `(version 1)\n(deny default)\n(import \"system.sb\")\n(allow process*)\n(allow file-read*)\n(allow file-write* (subpath \"${seatbeltPath(worktree)}\"))\n${network?'(allow network*)':'(deny network*)'}${keychain}`;
}
export function sandboxCommand(spec,{worktree,network=false,memoryMb=0,cpuSeconds=0,keychainAccess=false}){
 const d=detectSandbox();
 if(d.kind==='bubblewrap'){
   const args=['--die-with-parent','--new-session','--ro-bind','/','/','--bind',worktree,worktree,'--chdir',worktree,'--proc','/proc','--dev','/dev'];
   if(!network)args.push('--unshare-net'); args.push('--',spec.cmd,...spec.args); const pr=run('prlimit',['--version']); if(pr.status===0&&(memoryMb||cpuSeconds)){const limits=[];if(memoryMb)limits.push(`--as=${Math.floor(memoryMb*1024*1024)}`);if(cpuSeconds)limits.push(`--cpu=${Math.floor(cpuSeconds)}`);return {cmd:'prlimit',args:[...limits,'--','bwrap',...args],descriptor:{...d,network,memoryMb,cpuSeconds,resourceLimits:true,keychainAccess:false}};} return {cmd:'bwrap',args,descriptor:{...d,network,memoryMb,cpuSeconds,resourceLimits:false,keychainAccess:false}};
 }
 if(d.kind==='sandbox-exec') return {cmd:'sandbox-exec',args:['-p',macProfile(worktree,network,{keychainAccess}),spec.cmd,...spec.args],descriptor:{...d,network,memoryMb,cpuSeconds,resourceLimits:false,keychainAccess}};
 return {...spec,descriptor:{...d,network,memoryMb,cpuSeconds,resourceLimits:false,keychainAccess:false}};
}
export function sanitizedEnv(extra={}){const keep=['PATH','HOME','USER','LOGNAME','SHELL','TMPDIR','TEMP','TMP','SystemRoot','COMSPEC','PATHEXT','LANG','LC_ALL','TERM'];const out={SHIPSTATE_SANDBOX:'1'};for(const k of keep)if(process.env[k])out[k]=process.env[k];return {...out,...extra};}
