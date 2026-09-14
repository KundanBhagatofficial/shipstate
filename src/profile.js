import fs from 'node:fs';
import path from 'node:path';
import { walk, unique } from './utils.js';

const exists=(root,p)=>fs.existsSync(path.join(root,p));
const json=(root,p)=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}catch{return null;}};
function detectNode(root){ const p=json(root,'package.json'); if(!p) return null; const deps={...(p.dependencies||{}),...(p.devDependencies||{})}; const frameworks=[]; for(const [name,label] of [['next','nextjs'],['react','react'],['vue','vue'],['@angular/core','angular'],['svelte','svelte'],['expo','expo'],['react-native','react-native'],['electron','electron'],['nestjs','nestjs'],['express','express']]) if(deps[name]) frameworks.push(label); const pm=exists(root,'pnpm-lock.yaml')?'pnpm':exists(root,'yarn.lock')?'yarn':exists(root,'bun.lockb')||exists(root,'bun.lock')?'bun':'npm'; const scripts=p.scripts||{}; const commands={}; for(const k of ['test','lint','build','typecheck','check']) if(scripts[k]) commands[k]=`${pm} run ${k}`; if(!commands.test && scripts.test) commands.test=`${pm} test`; return {ecosystem:'node',languages:unique([exists(root,'tsconfig.json')?'typescript':'javascript']),frameworks,packageManager:pm,commands}; }
function detectPython(root){ if(!exists(root,'pyproject.toml')&&!exists(root,'requirements.txt')&&!exists(root,'setup.py')) return null; return {ecosystem:'python',languages:['python'],frameworks:[],packageManager:exists(root,'poetry.lock')?'poetry':exists(root,'uv.lock')?'uv':'pip',commands:{test:'pytest',lint:exists(root,'ruff.toml')||exists(root,'.ruff.toml')?'ruff check .':undefined,typecheck:exists(root,'mypy.ini')?'mypy .':undefined}}; }
function detectRust(root){ return exists(root,'Cargo.toml')?{ecosystem:'rust',languages:['rust'],frameworks:[],packageManager:'cargo',commands:{test:'cargo test',lint:'cargo clippy -- -D warnings',build:'cargo build'}}:null; }
function detectGo(root){ return exists(root,'go.mod')?{ecosystem:'go',languages:['go'],frameworks:[],packageManager:'go',commands:{test:'go test ./...',build:'go build ./...'}}:null; }
function detectJava(root){ if(exists(root,'gradlew')||exists(root,'build.gradle')||exists(root,'build.gradle.kts')) return {ecosystem:'java',languages:['java','kotlin'],frameworks:[],packageManager:'gradle',commands:{test:'./gradlew test',build:'./gradlew build'}}; if(exists(root,'pom.xml')) return {ecosystem:'java',languages:['java'],frameworks:[],packageManager:'maven',commands:{test:'mvn test',build:'mvn package'}}; return null; }
function detectSwift(root){ return exists(root,'Package.swift')?{ecosystem:'swift',languages:['swift'],frameworks:[],packageManager:'swiftpm',commands:{test:'swift test',build:'swift build'}}:null; }
function detectFlutter(root){ return exists(root,'pubspec.yaml')?{ecosystem:'dart',languages:['dart'],frameworks:['flutter'],packageManager:'flutter',commands:{test:'flutter test',lint:'flutter analyze',build:'flutter build'}}:null; }
export function detectProject(root=process.cwd()){
  const detectors=[detectNode,detectPython,detectRust,detectGo,detectJava,detectSwift,detectFlutter].map(f=>f(root)).filter(Boolean);
  const files=walk(root,{ignore:['.git/**','.shipstate/**','node_modules/**','vendor/**','dist/**','build/**','.next/**']});
  const testDirs=unique(files.filter(f=>/(^|\/)(test|tests|__tests__|spec)(\/|$)|\.(test|spec)\./i.test(f)).map(f=>f.includes('/')?f.split('/').slice(0,-1).join('/'):'')).filter(Boolean).slice(0,20);
  const sourceDirs=unique(files.filter(f=>/^(src|app|lib|packages|cmd|internal)\//.test(f)).map(f=>f.split('/')[0])).slice(0,20);
  const primary=detectors[0]||{ecosystem:'generic',languages:[],frameworks:[],packageManager:null,commands:{}};
  const ci=files.filter(f=>f.startsWith('.github/workflows/'));
  const docs=files.filter(f=>/^(README|AGENTS|CLAUDE|CONTRIBUTING)(\.|$)/i.test(path.basename(f))||f.startsWith('docs/')).slice(0,30);
  return {version:1,detectedAt:new Date().toISOString(),ecosystems:detectors.map(d=>d.ecosystem),languages:unique(detectors.flatMap(d=>d.languages)),frameworks:unique(detectors.flatMap(d=>d.frameworks)),packageManager:primary.packageManager,commands:Object.assign({},...detectors.map(d=>d.commands)),sourceDirs,testDirs,ci,docs,manifests:files.filter(f=>['package.json','pyproject.toml','Cargo.toml','go.mod','pom.xml','build.gradle','build.gradle.kts','Package.swift','pubspec.yaml','Dockerfile'].includes(path.basename(f))),fileCount:files.length};
}
export function defaultVerification(profile){ return unique([profile.commands?.test,profile.commands?.typecheck,profile.commands?.lint].filter(Boolean)); }
