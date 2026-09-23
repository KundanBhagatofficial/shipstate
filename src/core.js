export const TASK_STATES=Object.freeze(['PENDING','READY','RUNNING','IMPLEMENTED','VERIFYING','VERIFIED','ACCEPTING','ACCEPTED','FAILED','BLOCKED','REJECTED']);
const ALLOWED={
  PENDING:['READY','BLOCKED'], READY:['RUNNING','BLOCKED'], RUNNING:['IMPLEMENTED','FAILED','BLOCKED'],
  IMPLEMENTED:['VERIFYING','FAILED','BLOCKED','REJECTED'], VERIFYING:['VERIFIED','FAILED','BLOCKED'],
  VERIFIED:['ACCEPTING','REJECTED'], ACCEPTING:['ACCEPTED','VERIFIED','FAILED'], FAILED:['READY','BLOCKED','REJECTED'],
  BLOCKED:['READY','REJECTED'], REJECTED:['READY'], ACCEPTED:[]
};
export function assertTransition(from,to){ if(!TASK_STATES.includes(from)||!TASK_STATES.includes(to)||!(ALLOWED[from]||[]).includes(to)) throw new Error(`Invalid task transition: ${from} -> ${to}`); }
export function depsAccepted(task,byId){ return (task.dependsOn||[]).every(id=>byId[id]?.state==='ACCEPTED'); }
export function eligible(task,byId){ return ['PENDING','READY','FAILED'].includes(task.state)&&depsAccepted(task,byId); }
export function chooseNext(tasks){ const by=Object.fromEntries(tasks.map(t=>[t.id,t])); return tasks.filter(t=>eligible(t,by)).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.id.localeCompare(b.id))[0]||null; }
export function readiness(tasks){ if(!tasks.length) return 0; return Math.round(tasks.filter(t=>t.state==='ACCEPTED').length/tasks.length*100); }
export function dependencyClosure(taskId,tasks){ const by=Object.fromEntries(tasks.map(t=>[t.id,t])); const seen=new Set(); const visit=id=>{ for(const d of by[id]?.dependsOn||[]) if(!seen.has(d)){seen.add(d);visit(d);} }; visit(taskId); return [...seen]; }
